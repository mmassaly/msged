@echo off
ssh -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -N -R localhost:3000 ubuntu@51.38.190.20
