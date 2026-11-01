// default_elk_reference.js - Default ES|QL syntax reference and Data View patterns
// Used by menu_controller.js and options.js on ELK / Kibana pages.

(function(global) {
  // ES|QL syntax cheat-sheet. Structure mirrors indexes/macros/rest: { name, desc }
  // `desc` holds a clickable, insertable snippet.
  global.SPABOT_DEFAULT_ESQL_REFERENCE = [
    {
        name: 'FROM (data source)',
        desc: 'FROM logs-* '
    },
    {
        name: 'WHERE (filter rows)',
        desc: '| WHERE '
    },
    {
        name: 'Comparison',
        desc: '| WHERE http.response.status_code >= 500'
    },
    {
        name: 'AND / OR',
        desc: '| WHERE log.level == "error" AND service.name == "checkout"'
    },
    {
        name: 'NOT / exclude',
        desc: '| WHERE NOT user.name == "system"'
    },
    {
        name: 'Grouping with parentheses',
        desc: '| WHERE (log.level == "error" OR log.level == "warn") AND service.name == "api"'
    },
    {
        name: 'NULL check (field exists)',
        desc: '| WHERE error.message IS NOT NULL'
    },
    {
        name: 'LIKE (wildcard match)',
        desc: '| WHERE host.name LIKE "web-*"'
    },
    {
        name: 'RLIKE (regex match)',
        desc: '| WHERE message RLIKE ".*timeout.*"'
    },
    {
        name: 'IN (multiple values)',
        desc: '| WHERE user.name IN ("alice", "bob")'
    },
    {
        name: 'EVAL (derived field)',
        desc: '| EVAL duration_ms = event.duration / 1000000'
    },
    {
        name: 'STATS (aggregate)',
        desc: '| STATS cnt = COUNT(*) BY host.name | SORT cnt DESC'
    }
  ];

  // Data View (index pattern) suggestions. Users manage their own list via options.
  global.SPABOT_DEFAULT_ELK_DATAVIEWS = [
    {
        name: 'logs-*',
        desc: 'All log indices (Filebeat / logstash convention)'
    },
    {
        name: 'metrics-*',
        desc: 'Metricbeat and system metrics indices'
    },
    {
        name: 'filebeat-*',
        desc: 'Filebeat shipped logs'
    },
    {
        name: 'apm-*',
        desc: 'APM traces, spans and errors'
    },
    {
        name: '.kibana',
        desc: 'Kibana internal metadata'
    }
  ];
})(window);
