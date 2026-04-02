# rare-disease-prioritization-ui

An interpretable, user-friendly workflow for rare-disease prioritization.

## Overview

This repository contains a browser-based prototype for rare-disease prioritization from partial gene and phenotype cues. The interface is designed to support ranked disease output, diagnostic neighborhood interpretation, and conservative expansion guidance.

Rather than treating rare-disease inference only as a single-label prediction problem, this prototype emphasizes interpretable prioritization under compressed and noisy biological evidence.

## Features

- Gene set input
- Phenotype cue input
- Optional disease-context hint input
- Ranked disease prioritization
- Diagnostic neighborhood interpretation
- Conservative expansion guidance
- User-friendly browser interface

## Intended Use

This prototype is intended for workflow demonstration, research communication, and interface operationalization of an interpretable rare-disease prioritization framework.

It is designed to show how partial biological evidence can be translated into:
- a primary prioritized disease
- a secondary diagnostic neighborhood
- an eligibility judgment
- conditional downstream expansion guidance

## Disclaimer

This repository provides a research-oriented prototype. It is not a validated clinical diagnostic system and should not be used as a substitute for clinical judgment, medical advice, or certified diagnostic software.

## Tech Stack

- React
- Vite
- JavaScript
- CSS

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/pyochilla/rare-disease-prioritization-ui.git
cd rare-disease-prioritization-ui
