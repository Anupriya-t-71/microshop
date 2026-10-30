#!/usr/bin/env bash
kubectl delete -k "$(dirname "$0")/../k8s"
