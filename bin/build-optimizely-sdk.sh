#!/bin/bash

##
# Rebuild the latest version of the Optimizely Full Stack Javascript SDK and copy the compiled
# Javascript into this repository
##

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
ROOT_DIR="$SCRIPT_DIR/.."
DEST_DIR="$ROOT_DIR/optimizely-sdk"

TMPDIR="/tmp/temp-$RANDOM"

REPO="optimizely/javascript-sdk"
BRANCH="demo/odp"

PACKAGE_DIR="$TMPDIR/packages/optimizely-sdk"
PACKAGE_DIST_DIR="$PACKAGE_DIR/dist/optimizely-sdk"

# Create a temporary directory
rm -rf $TMPDIR
mkdir -p $TMPDIR 

# Clone the repository
git clone --branch $BRANCH git@github.com:$REPO $TMPDIR
echo "Cloned $BRANCH branch of github.com/$REPO into $TMPDIR"

# Build the js SDK
cd $PACKAGE_DIR; npm install

# Copy package into the destination directory
rm -rf $DEST_DIR
cp -r $PACKAGE_DIST_DIR $DEST_DIR
echo "Copied $PACKAGE_DIST_DIR into $DEST_DIR"

# Remove the temp directory
rm -rf $TMPDIR
echo "Removed $TMPDIR"