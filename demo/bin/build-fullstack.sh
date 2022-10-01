#!/bin/bash

##
# Rebuild the latest version of the Optimizely Full Stack Javascript SDK and copy the compiled
# Javascript into this repository
##

echo "Running bin/preinstall.sh"

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
ROOT_DIR="$SCRIPT_DIR/.."
DIST_DIR="$ROOT_DIR/dist"

REPO="optimizely/javascript-sdk"
BRANCH="demo/odp"

OPTIMIZELY_MODULES_DIR="$ROOT_DIR/../optimizely"
REPO_DIR="$OPTIMIZELY_MODULES_DIR/javascript-sdk"
PACKAGE_DIR="$REPO_DIR/packages/optimizely-sdk"

# Clone the repository
if [ ! -d $REPO_DIR ]; then
echo "Cloning github.com/$REPO#$BRANCH into $REPO_DIR"
rm -rf $REPO_DIR
mkdir -p $REPO_DIR
git clone --branch $BRANCH git@github.com:$REPO $REPO_DIR
echo "Cloned github.com/$REPO#$BRANCH into $REPO_DIR"
fi

echo "Running npm install in $PACKAGE_DIR"
cd $PACKAGE_DIR; npm install
