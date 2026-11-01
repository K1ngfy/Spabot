// default_elk_saved_searches.js - Pre-defined ES|QL Templates for ELK / Kibana Discover
// Structure mirrors SPABOT_DEFAULT_SAVED_SEARCHES: { name, value, group, label, code }

(function(global) {
  global.SPABOT_DEFAULT_ELK_SAVED_SEARCHES = [
    {
        name: 'HTTP 5xx Errors',
        group: 'Troubleshooting',
        value: 'FROM logs-* | WHERE http.response.status_code >= 500 | LIMIT 1000'
    },
    {
        name: 'Error Level Logs',
        group: 'Troubleshooting',
        value: 'FROM logs-* | WHERE log.level == "error" OR log.level == "fatal" | LIMIT 1000'
    },
    {
        name: 'Exception Messages',
        group: 'Troubleshooting',
        value: 'FROM logs-* | WHERE error.message IS NOT NULL | LIMIT 1000'
    },
    {
        name: 'Slow Requests',
        group: 'Troubleshooting',
        value: 'FROM logs-* | WHERE event.duration > 1000000 | SORT event.duration DESC | LIMIT 100'
    },
    {
        name: 'Filter by Host',
        group: 'General',
        value: 'FROM logs-* | WHERE host.name LIKE "web-*"'
    },
    {
        name: 'Filter by Service',
        group: 'General',
        value: 'FROM logs-* | WHERE service.name == "my-service" AND log.level == "info"'
    },
    {
        name: 'Field Exists',
        group: 'General',
        value: 'FROM logs-* | WHERE trace.id IS NOT NULL'
    },
    {
        name: 'Exclude Health Checks',
        group: 'General',
        value: 'FROM logs-* | WHERE NOT url.path LIKE "/health*" | LIMIT 1000'
    },
    {
        name: 'Generate UUID',
        value: '{{UUID}}',
        group: 'Tools'
    }
  ];
})(window);
