#!/bin/bash
# monitor.sh

API_URL="http://localhost:3000"
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
NC="\033[0m"

echo -e "${YELLOW}📊 Email Orchestrator Monitor${NC}"
echo "================================="

# Check API health
echo -e "\n🔍 Checking API Health..."
HEALTH_RESPONSE=$(curl -s -f "${API_URL}/health" || echo "ERROR")
if [[ "$HEALTH_RESPONSE" == *"healthy"* ]]; then
    echo -e "  ${GREEN}✅ API is healthy${NC}"
else
    echo -e "  ${RED}❌ API is unhealthy${NC}"
fi

# Check queues status
echo -e "\n📈 Checking Queues Status..."
QUEUES_RESPONSE=$(curl -s "${API_URL}/api/monitor/queues")
if [[ $? -eq 0 ]]; then
    echo "$QUEUES_RESPONSE" | jq -r '.status | to_entries[] | "  \(.key): \(.value.waiting) waiting, \(.value.active) active, \(.value.completed) completed, \(.value.failed) failed"'
else
    echo -e "  ${RED}❌ Failed to get queue status${NC}"
fi

# Check Redis connection
echo -e "\n🔗 Checking Redis..."
REDIS_PING=$(redis-cli -h localhost -p 6379 ping 2>/dev/null || echo "ERROR")
if [[ "$REDIS_PING" == "PONG" ]]; then
    echo -e "  ${GREEN}✅ Redis is connected${NC}"
    
    # Get Redis info
    REDIS_INFO=$(redis-cli -h localhost -p 6379 info memory 2>/dev/null | grep -E "used_memory_human|maxmemory_human")
    echo "  Memory usage:"
    echo "$REDIS_INFO" | while read line; do
        echo "    $line"
    done
else
    echo -e "  ${RED}❌ Redis is not connected${NC}"
fi

# Check MongoDB connection
echo -e "\n🗄️  Checking MongoDB..."
MONGO_STATUS=$(docker exec email-orchestrator-mongodb mongosh --quiet --eval "db.stats().ok" 2>/dev/null || echo "ERROR")
if [[ "$MONGO_STATUS" == "1" ]]; then
    echo -e "  ${GREEN}✅ MongoDB is connected${NC}"
else
    echo -e "  ${RED}❌ MongoDB is not connected${NC}"
fi

# Check n8n
echo -e "\n🤖 Checking n8n..."
N8N_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5678/healthz" || echo "ERROR")
if [[ "$N8N_STATUS" == "200" ]]; then
    echo -e "  ${GREEN}✅ n8n is running${NC}"
else
    echo -e "  ${RED}❌ n8n is not responding${NC}"
fi

# Check disk space
echo -e "\n💾 Disk Usage:"
df -h . | tail -1 | awk '{print "  Used: "$3", Free: "$4", Total: "$2}'

echo -e "\n${YELLOW}📋 Quick Access:${NC}"
echo "  Dashboard:   http://localhost:3000/admin/queues"
echo "  API Docs:    http://localhost:3000/api-docs"
echo "  Redis UI:    http://localhost:8081"
echo "  MongoDB UI:  http://localhost:8082"
echo "  n8n:         http://localhost:5678"