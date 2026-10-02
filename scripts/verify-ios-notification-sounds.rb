require "pathname"
require "rexml/document"
require "xcodeproj"

project = Xcodeproj::Project.open("ios/App/App.xcodeproj")
target = project.targets.find { |item| item.name == "App" }
abort "App target not found" unless target

resources = target.resources_build_phase.files_references
sources = target.source_build_phase.files_references
sounds = %w[siren_classic siren_urgent alarm_pulse fire_brigade]

sounds.each do |sound|
  reference = resources.find { |item| item.path == "#{sound}.wav" }
  abort "Sound missing from Copy Bundle Resources: #{sound}.wav" unless reference
  path = reference.real_path
  abort "Sound file missing: #{path}" unless path.file?
  abort "Sound differs from web preview: #{sound}" unless File.binread(path) == File.binread("public/sounds/#{sound}.wav")
end

%w[CustomNotificationSoundPlugin.swift MainViewController.swift].each do |name|
  reference = sources.find { |item| item.path == name }
  abort "Native source missing from Compile Sources: #{name}" unless reference && reference.real_path.file?
end

storyboard = REXML::Document.new(File.read("ios/App/App/Base.lproj/Main.storyboard"))
controller = REXML::XPath.first(storyboard, "//viewController")
unless controller && controller.attributes["customClass"] == "MainViewController" && controller.attributes["customModule"] == "App"
  abort "Main.storyboard must use App.MainViewController for the custom sound plugin"
end

firebase = resources.find { |item| item.path == "GoogleService-Info.plist" }
expected = Pathname.new("ios/App/App/GoogleService-Info.plist").expand_path
unless firebase && firebase.real_path.expand_path == expected && expected.file?
  abort "Firebase resource must use the plist generated from Codemagic secure environment"
end

puts "Verified: four bundled notification sounds, custom sound plugin, bridge and Firebase resource"
