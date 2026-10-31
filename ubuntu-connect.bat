@echo off
ssh -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -N -R localhost:3000 ubuntu@37.59.107.253
