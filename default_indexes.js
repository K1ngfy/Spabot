// default_indexes.js - Pre-defined Splunk Index References

(function(global) {
  global.SPABOT_DEFAULT_INDEXES = [
    { name: '_internal', desc: 'Splunk internal logs (errors, access, metrics)' },
    { name: '_audit', desc: 'Splunk audit trail (user actions, config changes)' },
    { name: '_introspection', desc: 'System resource usage (CPU, RAM, Disk)' },
    { name: '_telemetry', desc: 'Splunk telemetry data' },
    { name: '_fishbucket', desc: 'File monitoring checkpoints' },
    { name: 'summary', desc: 'Default summary index' },
    { name: 'main', desc: 'Default index for user data' },
    { name: 'history', desc: 'Search history' }
  ];
})(window);
