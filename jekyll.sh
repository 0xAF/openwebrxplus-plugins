#!/bin/bash
export GEM_HOME=$HOME/.gem

bundle install
bundle exec jekyll serve --baseurl=""

