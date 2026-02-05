// default_rest.js - Pre-defined Splunk REST API Endpoints

(function(global) {
  global.SPABOT_DEFAULT_REST = [
    {
      name: '/services/search/jobs',
      desc: 'Create a search job or list current jobs (POST/GET)'
    },
    {
      name: '/services/search/jobs/export',
      desc: 'Stream search results (GET)'
    },
    {
      name: '/services/server/info',
      desc: 'Get Splunk server information'
    },
    {
      name: '/services/authentication/users',
      desc: 'Manage users'
    },
    {
      name: '/services/authentication/current-context',
      desc: 'Get current user context'
    },
    {
      name: '/services/data/indexes',
      desc: 'Manage indexes'
    },
    {
      name: '/services/saved/searches',
      desc: 'Manage saved searches (reports/alerts)'
    },
    {
      name: '/services/apps/local',
      desc: 'List installed apps'
    },
    {
      name: '/services/messages',
      desc: 'System messages/bulletins'
    },
    {
      name: '/servicesNS/-/-/data/ui/views',
      desc: 'Manage dashboards/views'
    },
    {
      name: '/services/cluster/master/peers',
      desc: 'List indexer cluster peers'
    },
    {
      name: '/services/licenser/usage',
      desc: 'License usage details'
    },
    {
      name: '/services/configs/conf-props',
      desc: 'Read/Edit props.conf'
    },
    {
      name: '/services/configs/conf-transforms',
      desc: 'Read/Edit transforms.conf'
    },
    {
      name: '/services/data/inputs/tcp/raw',
      desc: 'Raw TCP inputs'
    }
  ];
})(window);
