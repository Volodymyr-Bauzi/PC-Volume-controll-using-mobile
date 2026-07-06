# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.5.0](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/compare/v1.4.0...v1.5.0) (2026-07-06)


### Features

* **websocket:** enhance WebSocket message structure and handling for application updates ([3945b2e](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/commit/3945b2ee9f67d4feff67a3bafc952de42e2e9951))

## [1.4.0](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/compare/v1.3.0...v1.4.0) (2026-07-06)


### Features

* **macos:** accessibility permission prompt and UI hint ([bc8e5c4](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/commit/bc8e5c4080d1cbeb5b8877f07934ec945ce1ec82))
* **macos:** native media keys, universal addon, and mac distributables ([c23e8d1](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/commit/c23e8d1f46144f816f3d33202d77f2b6b5314f72))

## [1.3.0](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/compare/v1.2.10...v1.3.0) (2026-07-04)


### Features

* add CardModal component for volume control with app icons and volume adjustment features ([0aa71ae](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/commit/0aa71ae8d629297fcb3d1969509e0bfd860101df))
* add presets, media controls, and app launcher UI ([84bec2b](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/commit/84bec2bc4e5861554a268bbebc94920bd8d99eaa))
* add Trust speaker control integration documentation ([045e1ea](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/commit/045e1eac0091275e05e1c5d6d5a34d5e90dcd92c))
* add WebSocket disable option and clean up CSS ([a7bdf33](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/commit/a7bdf336628bfc1dd81222cb1c6e7553266ddc6e))
* enhance audio control functionality and UI improvements ([736a880](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/commit/736a8809bf46d3f8596a1710c7fdfa544d214812))
* implement WebSocket heartbeat and accessibility features ([6453e70](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/commit/6453e70cf957c8f37db810d41ec492137b974d21))


### Bug Fixes

* **build:** bump node-gyp to v11 for Python 3.12+ and VS2026 support ([c7ae834](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/commit/c7ae83446ca5022ea86faedb1337122bfb3a8972))
* **platform:** add macOS master-volume support, stop non-Windows startup crashes ([6d0b112](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/commit/6d0b11219921c2e2d222971f2b15526f29e4b3e1))
* resolve lint errors, bump CI actions to v5 ([a7d3745](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/commit/a7d3745c0f07ad20d8557c2798d0f9d7f80b1a36))

### [1.2.4](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/compare/v1.2.3...v1.2.4) (2025-06-01)

## [1.2.0](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/compare/v1.1.10...v1.2.0) (2025-06-01)

### Features

* Standardized API and WebSocket port to 8777 for consistency
* Added production environment configuration
* Enhanced WebSocket reconnection and error handling
* Improved mobile device compatibility
* Streamlined server logging and status messages

### Bug Fixes

* Fixed connection refused errors in production builds
* Resolved WebSocket connection stability issues
* Improved error feedback and connection status

### BREAKING CHANGES

* All services now use port 8777 by default. Update your client configurations accordingly.

## 1.1.0 (2025-05-23)
