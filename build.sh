#!/bin/bash

##
# Rebuild the latest version of the Optimizely Full Stack Javascript SDK and copy the compiled
# Javascript into this repository
##

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
TMPDIR="/tmp/temp-$RANDOM"
REPO="optimizely/javascript-sdk"
BRANCH="demo/odp"
PACKAGE_PATH="$TMPDIR/packages/optimizely-sdk"
DIST_PATH="$PACKAGE_PATH/dist/optimizely.browser.umd.min.js"
MAP_PATH="$PACKAGE_PATH/dist/optimizely.browser.umd.min.js.map"

# Create a temporary directory
rm -rf $TMPDIR
mkdir -p $TMPDIR 

# Clone the repository
git clone --branch $BRANCH git@github.com:$REPO $TMPDIR
echo "Cloned $BRANCH branch of github.com/$REPO into $TMPDIR"

# Build the js SDK
cd $PACKAGE_PATH; npm install 

# Copy artifacts into this directory
cp $DIST_PATH $MAP_PATH $SCRIPT_DIR
echo "Copied $DIST_PATH into $SCRIPT_DIR"
echo "Copied $MAP_PATH into $SCRIPT_DIR"

# Remove the temp directory
rm -rf $TMPDIR
echo "Removed $TMPDIR"