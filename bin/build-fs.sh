#!/bin/bash

##
# Rebuild the latest version of the Optimizely Full Stack Javascript SDK and copy the compiled
# Javascript into this repository
##

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
ROOT_DIR="$SCRIPT_DIR/.."
DIST_DIR="$ROOT_DIR/dist"

TMPDIR="/tmp/temp-$RANDOM"

REPO="optimizely/javascript-sdk"
BRANCH="demo/odp"

PACKAGE_DIR="$TMPDIR/packages/optimizely-sdk"
PACKAGE_JS="$PACKAGE_DIR/dist/optimizely.browser.umd.min.js"
PACKAGE_MAP="$PACKAGE_DIR/dist/optimizely.browser.umd.min.js.map"

# Create a temporary directory
rm -rf $TMPDIR
mkdir -p $TMPDIR 

# Clone the repository
git clone --branch $BRANCH git@github.com:$REPO $TMPDIR
echo "Cloned $BRANCH branch of github.com/$REPO into $TMPDIR"

# Build the js SDK
cd $PACKAGE_DIR; npm install 

# Copy artifacts into the dist directory
mkdir -p $DIST_DIR
cp $PACKAGE_JS $PACKAGE_MAP $DIST_DIR
echo "Copied $PACKAGE_JS into $DIST_DIR"
echo "Copied $PACKAGE_MAP into $DIST_DIR"

# Remove the temp directory
rm -rf $TMPDIR
echo "Removed $TMPDIR"