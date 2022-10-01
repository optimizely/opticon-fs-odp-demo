#!/bin/bash

##
# Force https://opticon2022.opti-us.com/ to download the master branch of this repository
##

# This webhook will force foundation to download a fresh copy of this repository
curl "https://opticon2022.opti-us.com/RepoDownload/Download?repoUrl=https://github.com/optimizely/opticon-fs-odp-demo.git"
echo