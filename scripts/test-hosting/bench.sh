#!/usr/bin/env bash
# Runs the TEST HOSTING image under the EthioDeploy Free container limits (256 MB RAM, 0.5 CPU) with synthetic data
# of increasing size and reports boot time, memory and OOM kills. Prints only measurements — no data, no secrets.
set -u
IMG=reyadat-backend-test
PW="Tt9!$(openssl rand -hex 12)"   # throwaway, never printed
sample_mem() { docker stats --no-stream --format '{{.MemUsage}}' rbt 2>/dev/null | awk '{print $1}' | sed 's/MiB//;s/GiB/*1024/' | bc 2>/dev/null || echo 0; }

echo "BENCH-ENV	node=$(docker run --rm --entrypoint node $IMG -v)"

# 1) isolation guard: a database URL must make the container refuse to start
docker run --rm -e DATABASE_URL=postgres://u:p@example.invalid/db $IMG >/tmp/guard.log 2>&1; code=$?
echo "BENCH-GUARD	DATABASE_URL set → exit=$code refused=$(grep -c 'Refusing to start' /tmp/guard.log)"
docker run --rm -e STORAGE_BACKEND=postgres $IMG >/tmp/guard2.log 2>&1; code=$?
echo "BENCH-GUARD	STORAGE_BACKEND=postgres → exit=$code refused=$(grep -c 'Refusing to start' /tmp/guard2.log)"

run() {
  local scale=$1 img=$2 port=$3
  docker rm -f rbt >/dev/null 2>&1
  rm -rf /tmp/seed && mkdir -p /tmp/seed && chmod 777 /tmp/seed
  HASH=$(docker run --rm --entrypoint node -e PW="$PW" reyadat-backend-test -e "process.stdout.write(require('bcryptjs').hashSync(process.env.PW,10))")
  node --input-type=module -e "
    import fs from 'fs'; import { buildSyntheticDb } from '$PWD/scripts/test-hosting/synthetic-data.mjs';
    fs.writeFileSync('/tmp/seed/db.json', JSON.stringify(buildSyntheticDb({ scale: $scale, imageKb: $img, adminPasswordHash: process.argv[1] })));" "$HASH"
  chmod 666 /tmp/seed/db.json
  local t0=$(date +%s.%N)
  docker run -d --name rbt --memory=256m --memory-swap=256m --cpus=0.5 -p $port:$port -e PORT=$port -v /tmp/seed:/app/.test-data \
    -e TEST_ADMIN_PASSWORD="$PW" -e TEST_DATA_SCALE=$scale -e TEST_DATA_IMAGE_KB=$img $IMG >/dev/null
  local ok=0
  for i in $(seq 1 240); do
    if curl -sf -m 5 -o /dev/null "http://127.0.0.1:$port/api/health"; then ok=1; break; fi
    if [ "$(docker inspect -f '{{.State.Running}}' rbt)" != "true" ]; then break; fi
    sleep 0.5
  done
  local boot=$(echo "$(date +%s.%N) - $t0" | bc)
  local listen=$(docker exec rbt sh -c "cat /proc/net/tcp | awk 'NR>1{print \$2}' | grep -ci ':$(printf '%04X' $port)\$'" 2>/dev/null)
  local anyaddr=$(docker exec rbt sh -c "cat /proc/net/tcp | awk 'NR>1 && \$4==\"0A\"{print \$2}' | grep -ci '^00000000:$(printf '%04X' $port)\$'" 2>/dev/null)
  local root=$(curl -s -m 10 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/")
  local dbmb=$(docker exec rbt sh -c 'stat -c %s /app/.test-data/db.json' 2>/dev/null | awk '{printf "%.1f", $1/1048576}')
  local idle=$(sample_mem); local peak=$idle; local lightpeak=$idle
  if [ $ok -eq 1 ]; then
    # load: 30 sign-ins (each persists the whole document), 6 parallel full-database reads, 20 list reads
    ( while docker inspect -f '{{.State.Running}}' rbt 2>/dev/null | grep -q true; do sample_mem >> /tmp/mem.$scale.$img; sleep 0.5; done ) &
    local sampler=$!
    local tok=""
    for i in $(seq 1 30); do
      if [ $i -eq 30 ]; then :; fi
      r=$(curl -s -m 30 -X POST "http://127.0.0.1:$port/api/db/auth/login" -H 'content-type: application/json' -H "x-forwarded-for: 198.18.0.$i" \
          -d "{\"identifier\":\"admin\",\"password\":\"$PW\"}")
      [ -z "$tok" ] && tok=$(echo "$r" | sed -n 's/.*"sessionToken":"\([^"]*\)".*/\1/p')
    done
    curl -s -m 60 -o /dev/null -H "x-session-token: $tok" "http://127.0.0.1:$port/api/db"
    sleep 1; lightpeak=$(sort -n /tmp/mem.$scale.$img 2>/dev/null | tail -1)
    pids=""
    for i in $(seq 1 6); do curl -s -m 60 -o /dev/null -H "x-session-token: $tok" "http://127.0.0.1:$port/api/db" & pids="$pids $!"; done
    for p in $pids; do wait $p; done
    for i in $(seq 1 20); do curl -s -m 30 -o /dev/null -H "x-session-token: $tok" "http://127.0.0.1:$port/api/db/beneficiaries"; done
    sleep 2; kill $sampler 2>/dev/null
    peak=$(sort -n /tmp/mem.$scale.$img 2>/dev/null | tail -1)
    [ -z "$tok" ] && tok_status="login-failed" || tok_status="login-ok"
  else tok_status="not-started"; fi
  local oom=$(docker inspect -f '{{.State.OOMKilled}}' rbt); local running=$(docker inspect -f '{{.State.Running}}' rbt)
  local seeded=$(docker exec rbt node -e "
    const fs=require('fs');const d=JSON.parse(fs.readFileSync('/app/.test-data/db.json','utf8'));
    import('/app/scripts/test-hosting/synthetic-data.mjs').then(m=>{const a=m.buildSyntheticDb({scale:$scale,imageKb:0});
      const out=[];for(const k of Object.keys(d)){if(k.startsWith('_'))continue;const av=a[k],dv=d[k];
        if(av===undefined)out.push(k+'(+new)');else if(Array.isArray(dv)&&Array.isArray(av)&&dv.length>av.length&&!['activeSessions','logs','accessAuditLogs'].includes(k))out.push(k+'(+'+(dv.length-av.length)+')');}
      const s=JSON.stringify(d);const real=(s.match(/riadataleata/gi)||[]).length;
      const where=Object.keys(d).filter(k=>/riadataleata/i.test(JSON.stringify(d[k]))).join('|')||'-';
      const extraUsers=(d.userDepartmentAccess||[]).map(u=>u.userId).filter(id=>!['admin-user','ops-manager'].includes(id)).join('|')||'-';
      const grown=out.filter(x=>!x.endsWith('(+new)')).join(',')||'none';
      console.log('grown='+grown+' newEmptyCollections='+out.filter(x=>x.endsWith('(+new)')).length+' realDomainMentions='+real+' in='+where+' extraUsers='+extraUsers);});" 2>/dev/null)
  echo "BENCH	scale=$scale	imageKb=$img	dbMB=$dbmb	boot_s=$(printf '%.1f' $boot)	health=$ok	root=$root	port=$port listening=$listen on0.0.0.0=$anyaddr	idleMiB=$idle	lightPeakMiB=$lightpeak	heavyPeakMiB=$peak	oomKilled=$oom	running=$running	$tok_status	seededAtBoot=$seeded"
  [ "$oom" = "true" ] || [ $ok -eq 0 ] && docker logs rbt 2>&1 | grep -E "FATAL|heap|Killed|Refusing|Error" | head -3 | sed 's/^/BENCH-LOG	/'
  docker rm -f rbt >/dev/null 2>&1
}

run 1 0 8123      # also proves PORT is honoured (non-default port)
run 5 0 3000
run 8 0 3000
run 12 0 3000
run 20 0 3000
run 5 10 3000
