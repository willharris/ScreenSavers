# ScreenSavers

An Apple TV app built with TVML for browsing and playing the aerial screensavers available on the Apple TV. Unfortunately, through the system itself there is no way to browse or preview the screensavers, nor a way to force showing a particular saver.

![Screenshot](https://github.com/willharris/ScreenSavers/raw/master/Resources/screenshot.png "Screenshot")


Inspired by http://benjaminmayo.co.uk/watch-all-the-apple-tv-aerial-video-screensavers. There's also a desktop screensaver app that also taps the same videos at https://github.com/JohnCoates/Aerial/.

#### Features
- Pulls the list of available screensavers from the Apple CDN
- Dynamically creates a preview icon for each screensaver by grabbing a frame from the movie stream
- Plays the screensavers as normal videos using the Apple TV media player

#### Requirements
- Built using XCode 9 and Swift 4, tested on an Apple TV 4K with iOS 11.1
- The contents of the `Resources/server` directory needs to be placed on a web server accessible by the Apple TV box
  - Adjust the `tvBaseURL` value in `AppDelegate.swift` to point to the appropriate server location

#### To Do
- Clean up the code and remove unneeded resources
- Use a more elegant "loading" image for the preview images
- Add some functionality to auto-play all or a selection of savers
- Filter for night/day savers
- Write a few tests!
