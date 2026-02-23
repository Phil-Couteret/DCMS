#!/bin/bash
# Bootstrap OVH VPS for DCMS (Ubuntu 22.04/24.04)
# Run ONCE on a fresh OVH VPS: curl -sSf https://... | bash
# Or: scp deploy/ovh/bootstrap-vps.sh ubuntu@YOUR_OVH_IP:~ && ssh ubuntu@YOUR_OVH_IP 'bash ~/bootstrap-vps.sh'
#
# Installs: Docker, K3s, kubectl, cert-manager prereqs

set -e

echo "==> DCMS OVH VPS Bootstrap (Ubuntu)"
echo ""

# Update system
echo "==> [1/5] Updating system..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# Install Docker
echo "==> [2/5] Installing Docker..."
if ! command -v docker &>/dev/null; then
  sudo apt-get install -y -qq ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker "$USER"
  echo "    Docker installed. You may need to log out and back in for docker group."
fi

# Install K3s
echo "==> [3/5] Installing K3s..."
if ! command -v k3s &>/dev/null; then
  curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644
  echo "    K3s installed."
fi

# Configure kubectl for current user
echo "==> [4/5] Configuring kubectl..."
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config 2>/dev/null || true
sudo chown "$USER:$USER" ~/.kube/config
chmod 600 ~/.kube/config
export KUBECONFIG=~/.kube/config

# Verify
echo "==> [5/5] Verifying..."
sleep 3
kubectl cluster-info 2>/dev/null || true

echo ""
echo "==> Bootstrap complete."
echo ""
echo "Next steps:"
echo "  1. From your Mac: OVH_HOST=YOUR_OVH_IP ./deploy/ovh/sync-build-deploy.sh"
echo "  2. Ensure DNS A records point to this VPS IP:"
echo "     - api.couteret.fr"
echo "     - admin.couteret.fr"
echo "     - dcms.couteret.fr"
echo "     - *.api.couteret.fr, *.admin.couteret.fr, *.dcms.couteret.fr (wildcard)"
echo ""
