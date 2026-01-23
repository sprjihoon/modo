# encoding: UTF-8
require 'xcodeproj'

project_path = 'Runner.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Find the Runner target
target = project.targets.find { |t| t.name == 'Runner' }

# Find the Runner group
runner_group = project.main_group.find_subpath('Runner', true)

# Check if GoogleService-Info.plist is already added
existing = runner_group.files.find { |f| f.display_name == 'GoogleService-Info.plist' }

if existing.nil?
  # Add the file reference
  file_ref = runner_group.new_file('GoogleService-Info.plist')
  
  # Add to Resources build phase
  resources_phase = target.resources_build_phase
  resources_phase.add_file_reference(file_ref)
  
  project.save
  puts 'GoogleService-Info.plist added to Xcode project'
else
  puts 'GoogleService-Info.plist already exists in project'
end

