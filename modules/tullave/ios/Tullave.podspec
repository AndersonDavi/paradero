Pod::Spec.new do |s|
  s.name           = 'Tullave'
  s.version        = '1.0.0'
  s.summary        = 'Reads a TuLlave card over NFC'
  s.description    = 'Sends the TuLlave card commands with Core NFC and returns the raw answers. Nothing leaves the phone.'
  s.author         = 'Croma'
  s.license        = 'MIT'
  s.homepage       = 'https://github.com/croma-labs/paradero'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'CoreNFC'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
