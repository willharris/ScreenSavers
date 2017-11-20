//
//  AppDelegate.swift
//  ScreenSavers
//
//  Created by William Harris on 16.11.2017.
//  Copyright © 2017 harris.ch. All rights reserved.
//

import AVFoundation
import UIKit
import TVMLKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, TVApplicationControllerDelegate {
    
    var window: UIWindow?
    var appController: TVApplicationController?
    
    // tvBaseURL points to a server on your local machine. To create a local server for testing purposes, use the following command inside your project folder from the Terminal app: ruby -run -ehttpd . -p9001. See NSAppTransportSecurity for information on using a non-secure server.
    static let tvBaseURL = "https://screensavers.harris.ch/"
    static let tvBootURL = "\(AppDelegate.tvBaseURL)js/application.js"
    
    // MARK: Javascript Execution Helper
    
    func executeRemoteMethod(_ methodName: String, completion: @escaping (Bool) -> Void) {
        appController?.evaluate(inJavaScriptContext: { (context: JSContext) in
            let appObject : JSValue = context.objectForKeyedSubscript("App")
            
            if appObject.hasProperty(methodName) {
                appObject.invokeMethod(methodName, withArguments: [])
            }
            }, completion: completion)
    }
    
    // MARK: UIApplicationDelegate
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplicationLaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        window = UIWindow(frame: UIScreen.main.bounds)
        
        // Create the TVApplicationControllerContext for this application and set the properties that will be passed to the `App.onLaunch` function in JavaScript.
        let appControllerContext = TVApplicationControllerContext()
        
        // The JavaScript URL is used to create the JavaScript context for your TVMLKit application. Although it is possible to separate your JavaScript into separate files, to help reduce the launch time of your application we recommend creating minified and compressed version of this resource. This will allow for the resource to be retrieved and UI presented to the user quickly.
        if let javaScriptURL = URL(string: AppDelegate.tvBootURL) {
            appControllerContext.javaScriptApplicationURL = javaScriptURL
        }
        
        appControllerContext.launchOptions["BASEURL"] = AppDelegate.tvBaseURL as NSString
        
        if let launchOptions = launchOptions {
            for (kind, value) in launchOptions {
                appControllerContext.launchOptions[kind.rawValue] = value
            }
        }
        
        appController = TVApplicationController(context: appControllerContext, window: window, delegate: self)
        
        return true
    }
    
    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and stop playback
        executeRemoteMethod("onWillResignActive", completion: { (success: Bool) in
            // ...
        })
    }
    
    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
        executeRemoteMethod("onDidEnterBackground", completion: { (success: Bool) in
            // ...
        })
    }
    
    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
        executeRemoteMethod("onWillEnterForeground", completion: { (success: Bool) in
            // ...
        })
    }
    
    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
        executeRemoteMethod("onDidBecomeActive", completion: { (success: Bool) in
            // ...
        })
    }
    
    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
        executeRemoteMethod("onWillTerminate", completion: { (success: Bool) in
            // ...
        })
    }
    
    // MARK: TVApplicationControllerDelegate
    
    func appController(_ appController: TVApplicationController, didFinishLaunching options: [String: Any]?) {
        print("\(#function) invoked with options: \(options ?? [:])")
    }
    
    func appController(_ appController: TVApplicationController, didFail error: Error) {
        print("\(#function) invoked with error: \(error)")
        
        let title = "Error Launching Application"
        let message = error.localizedDescription
        let alertController = UIAlertController(title: title, message: message, preferredStyle:.alert )
        
        self.appController?.navigationController.present(alertController, animated: true, completion: {
            // ...
        })
    }
    
    func appController(_ appController: TVApplicationController, didStop options: [String: Any]?) {
        print("\(#function) invoked with options: \(options ?? [:])")
    }

    let getThumbnail_script : @convention(block) (String, String) -> String = {
        (imageId : String, urlStr : String) -> String in
        let url = URL(string: urlStr)
//        let url = URL(string: "http://localhost:8080/data/test.mov")
        return AppDelegate.getThumbnail(imageId: imageId, url: url!)
    }
    
    func appController(_ appController: TVApplicationController, evaluateAppJavaScriptIn jsContext: JSContext){
        jsContext.setObject(unsafeBitCast(getThumbnail_script, to: AnyObject.self),
                            forKeyedSubscript: "getThumbnail" as (NSCopying & NSObjectProtocol)!)
    }
    
    // MARK: Preview image grabbing
    
    static func getCachesDirectory() -> URL {
        let paths = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)
        return paths[0]
    }
    
    static func getThumbnail(imageId: String, url : URL) -> String {
        let filename = getCachesDirectory().appendingPathComponent("\(imageId).png")
        
//        var frameImg : UIImage? = UIImage(contentsOfFile: filename.absoluteString)

        let exists = FileManager.default.fileExists(atPath: filename.relativePath)
        
        if !exists {
            print("Didn't find cache file for ID \(imageId) - downloading from \(url)")
            let asset : AVAsset = AVAsset(url: url)
            
            let assetImgGenerate : AVAssetImageGenerator = AVAssetImageGenerator(asset: asset)
            assetImgGenerate.appliesPreferredTrackTransform = true
            assetImgGenerate.requestedTimeToleranceAfter = kCMTimeZero
            assetImgGenerate.requestedTimeToleranceBefore = kCMTimeZero
            
            let time : CMTime = CMTimeMakeWithSeconds(Float64(3.00), 600)
            let img : CGImage?
            do {
                img = try assetImgGenerate.copyCGImage(at: time, actualTime: nil)
            } catch {
                img = nil
                print(error)
            }
            
            if img != nil {
                let frameImg : UIImage = UIImage(cgImage: img!)
                if let data = UIImagePNGRepresentation(frameImg) {
                    try? data.write(to: filename)
                    print("Wrote cache file for \(imageId): \(filename)")
                }
            }
        }

        return filename.absoluteString
    }
    
}

