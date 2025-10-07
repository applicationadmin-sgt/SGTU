# 📚 Scalable Live Classroom System - Deployment Guide

## 🎯 Overview

This system transforms your educational platform into a **CodeTantra-style live classroom** capable of handling **10,000+ concurrent students** per session using:

- **Mediasoup SFU** for efficient video distribution
- **Redis Clustering** for Socket.IO scaling  
- **PostgreSQL** for robust data storage
- **Docker + Kubernetes** for enterprise deployment
- **React Frontend** with CodeTantra-like interface

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Students      │    │   Teachers      │    │   Admins        │
│   (10,000+)     │    │   (Multiple)    │    │   (HODs/etc)    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
┌─────────────────────────────────▼─────────────────────────────────┐
│                        Nginx Load Balancer                        │
│                     (SSL Termination + Routing)                   │
└─────────────────────────┬─────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
┌─────────▼─────────┐ ┌───▼────┐ ┌───────▼────────┐
│  React Frontend   │ │  API   │ │  Socket.IO     │
│  (CodeTantra UI)  │ │        │ │  (Real-time)   │
└───────────────────┘ └────────┘ └────────────────┘
                          │               │
                    ┌─────▼─────┐ ┌───────▼────────┐
                    │Mediasoup  │ │ Redis Cluster  │
                    │SFU Service│ │ (Scaling)      │
                    └───────────┘ └────────────────┘
                          │               │
                    ┌─────▼─────┐ ┌───────▼────────┐
                    │PostgreSQL │ │ Analytics &    │
                    │Database   │ │ Monitoring     │
                    └───────────┘ └────────────────┘
```

## 🚀 Quick Start (Docker)

### Prerequisites
```bash
# Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 1. Environment Setup
```bash
# Clone repository
git clone https://github.com/your-org/scalable-classroom.git
cd scalable-classroom

# Create environment file
cp .env.example .env

# Edit configuration
nano .env
```

**.env Configuration:**
```bash
# Domain & SSL
DOMAIN=classroom.yourdomain.com
EXTERNAL_IP=your.server.ip

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=liveclass_db
DB_USER=liveclass_user
DB_PASS=SecurePassword123!

# Redis
REDIS_URL=redis://redis:6379

# Mediasoup
MEDIASOUP_MIN_PORT=10000
MEDIASOUP_MAX_PORT=10100

# SSL Certificates
SSL_CERT_PATH=./ssl/cert.pem
SSL_KEY_PATH=./ssl/key.pem

# Scaling Configuration
MAX_CONCURRENT_USERS=10000
WORKER_INSTANCES=5
REDIS_CLUSTER_NODES=3
```

### 2. SSL Certificates
```bash
# Generate self-signed for testing
mkdir -p ssl
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes

# OR use Let's Encrypt for production
sudo apt install certbot
sudo certbot certonly --standalone -d classroom.yourdomain.com
sudo cp /etc/letsencrypt/live/classroom.yourdomain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/classroom.yourdomain.com/privkey.pem ssl/key.pem
```

### 3. Deploy with Docker
```bash
# Build and start all services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f mediasoup-service

# Scale Mediasoup workers
docker-compose up -d --scale mediasoup-service=5
```

### 4. Database Setup
```bash
# Initialize database
docker-compose exec postgres psql -U liveclass_user -d liveclass_db -f /docker-entrypoint-initdb.d/init.sql

# Verify tables created
docker-compose exec postgres psql -U liveclass_user -d liveclass_db -c "\\dt"
```

## ☸️ Kubernetes Deployment (Production)

### Prerequisites
```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify cluster access
kubectl cluster-info
```

### 1. Prepare Images
```bash
# Build and push images to your registry
docker build -f Dockerfile.mediasoup -t your-registry/mediasoup-sfu:latest .
docker build -f frontend/Dockerfile.production -t your-registry/classroom-frontend:latest ./frontend

docker push your-registry/mediasoup-sfu:latest
docker push your-registry/classroom-frontend:latest
```

### 2. Deploy to Kubernetes
```bash
# Create namespace
kubectl create namespace live-classroom

# Deploy secrets
kubectl create secret generic postgres-secret \
  --from-literal=username=liveclass_user \
  --from-literal=password=SecurePassword123! \
  -n live-classroom

# Apply all manifests
kubectl apply -f k8s/deployment.yaml

# Check rollout status
kubectl rollout status deployment/mediasoup-sfu -n live-classroom
kubectl rollout status deployment/frontend -n live-classroom
```

### 3. Configure Ingress & SSL
```bash
# Install NGINX Ingress Controller
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace

# Install cert-manager for automatic SSL
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@domain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### 4. Scaling Configuration
```bash
# Scale Mediasoup instances
kubectl scale deployment mediasoup-sfu --replicas=10 -n live-classroom

# Configure Horizontal Pod Autoscaler
kubectl autoscale deployment mediasoup-sfu \
  --cpu-percent=70 \
  --min=5 --max=20 \
  -n live-classroom

# Monitor scaling
kubectl get hpa -n live-classroom -w
```

## 📊 Monitoring & Analytics

### 1. Prometheus & Grafana
```bash
# Install monitoring stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  --set grafana.adminPassword=admin123

# Access Grafana
kubectl port-forward svc/monitoring-grafana 3000:80 -n monitoring
# Visit http://localhost:3000 (admin/admin123)
```

### 2. Application Metrics
```bash
# View Mediasoup metrics
curl https://classroom.yourdomain.com/metrics

# Key metrics to monitor:
# - concurrent_connections
# - active_rooms
# - cpu_usage
# - memory_usage
# - network_throughput
# - packet_loss_rate
```

## 🔧 Configuration

### Frontend Environment Variables
```javascript
// frontend/.env.production
REACT_APP_SOCKET_URL=https://classroom.yourdomain.com
REACT_APP_API_URL=https://classroom.yourdomain.com/api
REACT_APP_ENVIRONMENT=production
REACT_APP_MAX_PARTICIPANTS=10000
REACT_APP_VIDEO_QUALITY=auto
REACT_APP_AUDIO_QUALITY=high
```

### Backend Configuration
```javascript
// backend/config/production.js
module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
  },

  // Database Configuration
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    pool: {
      min: 5,
      max: 100,
    },
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL,
    options: {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    },
  },

  // Mediasoup Configuration
  mediasoup: {
    workers: parseInt(process.env.WORKER_INSTANCES) || 5,
    router: {
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
      ],
    },
    webRtcTransport: {
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP,
        },
      ],
      maxIncomingBitrate: 1500000,
      initialAvailableOutgoingBitrate: 1000000,
    },
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
  },
};
```

## 🧪 Testing

### Load Testing
```bash
# Install Artillery for load testing
npm install -g artillery

# Test WebSocket connections
artillery run loadtest/socket-test.yml

# Test video streaming
artillery run loadtest/video-test.yml
```

**loadtest/socket-test.yml:**
```yaml
config:
  target: 'https://classroom.yourdomain.com'
  phases:
    - duration: 300
      arrivalRate: 100
      name: "Simulate 10,000 concurrent users"
  socketio:
    transports: ['websocket']
scenarios:
  - name: "Join classroom and send messages"
    weight: 100
    engine: socketio
    flow:
      - emit:
          channel: "joinClass"
          data:
            classId: "test-class-001"
            userRole: "student"
      - think: 5
      - emit:
          channel: "chatMessage"
          data:
            text: "Hello from load test"
      - think: 60
```

### Performance Benchmarks
```bash
# Expected Performance Targets:
# - 10,000+ concurrent WebSocket connections
# - <200ms WebRTC connection establishment
# - <100ms message latency
# - 99.9% uptime
# - <5% CPU usage per 1,000 users
# - <2GB RAM per 1,000 users
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. WebRTC Connection Failed
```bash
# Check Mediasoup logs
kubectl logs -f deployment/mediasoup-sfu -n live-classroom

# Verify UDP ports are open
sudo ufw allow 10000:10100/udp

# Check NAT traversal
# Ensure STUN/TURN servers are configured if behind NAT
```

#### 2. Redis Connection Issues
```bash
# Check Redis cluster status
kubectl exec -it redis-cluster-0 -n live-classroom -- redis-cli cluster nodes

# Monitor Redis performance
kubectl exec -it redis-cluster-0 -n live-classroom -- redis-cli info
```

#### 3. Database Performance
```bash
# Monitor PostgreSQL connections
kubectl exec -it postgres-0 -n live-classroom -- psql -U liveclass_user -d liveclass_db -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
kubectl exec -it postgres-0 -n live-classroom -- psql -U liveclass_user -d liveclass_db -c "SELECT query FROM pg_stat_activity WHERE state = 'active';"
```

### Performance Tuning

#### Optimize for High Concurrency
```bash
# Increase file descriptor limits
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Tune kernel network settings
echo "net.core.somaxconn = 65536" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65536" >> /etc/sysctl.conf
sysctl -p
```

#### Database Optimization
```sql
-- Optimize PostgreSQL for high concurrency
ALTER SYSTEM SET max_connections = 500;
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
SELECT pg_reload_conf();
```

## 📈 Scaling Guidelines

### Horizontal Scaling Rules
- **1 Mediasoup worker** = ~500-1,000 concurrent students
- **1 Redis instance** = ~10,000 Socket.IO connections  
- **1 PostgreSQL replica** = ~5,000 concurrent database operations

### Recommended Cluster Sizes
```bash
# Small deployment (up to 5,000 users)
Mediasoup Workers: 5
Redis Instances: 1
PostgreSQL: 1 (with replicas)

# Medium deployment (up to 25,000 users)  
Mediasoup Workers: 25
Redis Instances: 3 (cluster)
PostgreSQL: 1 primary + 2 replicas

# Large deployment (up to 100,000 users)
Mediasoup Workers: 100
Redis Instances: 5 (cluster)
PostgreSQL: 1 primary + 5 replicas
```

## 🔐 Security Considerations

### Production Security Checklist
- [ ] Use strong passwords for all services
- [ ] Enable SSL/TLS for all communications  
- [ ] Configure proper firewall rules
- [ ] Enable authentication for all admin endpoints
- [ ] Regular security updates
- [ ] Monitor for suspicious activity
- [ ] Backup encryption
- [ ] Network policies in Kubernetes

### SSL/TLS Configuration
```bash
# Generate strong SSL certificate
openssl req -new -x509 -keyout server.pem -out server.pem -days 365 -nodes -config <(
cat <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no
[req_distinguished_name]
CN = classroom.yourdomain.com
[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = classroom.yourdomain.com
DNS.2 = *.classroom.yourdomain.com
EOF
)
```

## 🚀 Go Live Checklist

- [ ] Domain DNS configured
- [ ] SSL certificates installed
- [ ] Database initialized and backed up
- [ ] All services running and healthy
- [ ] Load balancer configured
- [ ] Monitoring and alerts set up
- [ ] Backup strategy implemented
- [ ] Security hardening completed
- [ ] Load testing passed
- [ ] Documentation updated
- [ ] Team trained on operations

## 📞 Support

For technical support and questions:
- 📧 Email: support@yourdomain.com
- 📱 Slack: #live-classroom-support
- 📚 Wiki: https://wiki.yourdomain.com/classroom
- 🐛 Issues: https://github.com/your-org/scalable-classroom/issues

---
**🎉 Your scalable live classroom system is now ready to handle 10,000+ concurrent students with CodeTantra-like features!**