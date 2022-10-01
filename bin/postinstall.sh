#!/bin/bash

##
# Rebuild the latest version of the Optimizely Full Stack Javascript SDK and copy the compiled
# Javascript into this repository
##

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
ROOT_DIR="$SCRIPT_DIR/.."
DEST_DIR="$ROOT_DIR/optimizely"

REPO="optimizely/javascript-sdk"
BRANCH="demo/odp"

TEMP_DIR="/tmp/temp-$RANDOM"
TEMP_REPO_DIR="$TEMP_DIR/javascript-sdk"
PACKAGE_DIR="$TEMP_REPO_DIR/packages/optimizely-sdk"
PACKAGE_DIST_DIR="$PACKAGE_DIR/dist"

# Create a temporary directory
rm -rf $TEMP_DIR
mkdir -p $TEMP_REPO_DIR 

# Clone the repository
git clone --branch $BRANCH git@github.com:$REPO $TEMP_REPO_DIR
echo "Cloned $BRANCH branch of github.com/$REPO into $TEMP_REPO_DIR"

# Build the js SDK
cd $PACKAGE_DIR; npm install
rm -rf $DEST_DIR
mkdir -p $DEST_DIR
cp -r $TEMP_REPO_DIR $DEST_DIR

# Remove the temp directory
rm -rf $TEMP_DIR
echo "Removed $TEMP_DIR"