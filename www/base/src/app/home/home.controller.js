/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
class Home {
    constructor($scope, dataService, config, $location, $state) {
        $scope.baseurl = $location.absUrl().split("#")[0];
        $scope.config = config;

        const data = dataService.open().closeOnDestroy($scope);
        $scope.builders = data.getBuilders();
        $scope.hasBuilds = b => (b.recentBuilds != null ? b.recentBuilds.length : undefined) > 0 || 
            (b.buildsRunning != null ? b.buildsRunning.length : undefined) > 0;

        $scope.builders.onNew = function(builder) {
            // const byNumber = (a, b) => a.number - b.number;
            
            let onNewBuild = function(build) {
                build.getProperties().onNew = function(properties)
                {
                    build.buildProperties = properties;
                };
                data.getBuildrequests(build.buildrequestid).onNew = function(buildrequest) {
                    data.getBuildsets(buildrequest.buildsetid).onNew = function(buildset) {
                        build.branch = buildset.sourcestamps[0].branch ? buildset.sourcestamps[0].branch : buildset.sourcestamps[0].revision;
                        build.owner = build.properties.owners[0][0];
                    };
                };
            };

            builder.buildsRunning = data.getBuilds({order: '-started_at', complete: false, property: ["owners"], builderid__eq:[builder.builderid]});
            builder.recentBuilds = data.getBuilds({order: '-buildid', complete: true, limit:20, property: ["owners"], builderid__eq:[builder.builderid]});

            builder.buildsRunning.onNew = onNewBuild;
            builder.recentBuilds.onNew = onNewBuild;

            builder.buildrequests = data.getBuildrequests({claimed:false});
            builder.buildrequests.onNew = buildrequest => {
                data.getBuildsets(buildrequest.buildsetid).onNew = function (buildset) {
                    buildset.getProperties().onNew = properties => {
                        buildrequest.buildProperties = properties;  // publicFieldsFilter(properties);
                    };
                    buildrequest.branch = buildset.sourcestamps[0].branch ? buildset.sourcestamps[0].branch : buildset.sourcestamps[0].revision;
                };
            };
            
            // builder.buildsRunning.forEach(function(build) {
            //     const builder = $scope.builders.get(build.builderid);
            //     if (builder != null) {
            //         if (builder.buildsRunning.indexOf(build) < 0) {
            //             builder.buildsRunning.push(build);
            //             builder.buildsRunning.sort(byNumber);
            //         }
            //     }
            // });
            //
            // $scope.recentBuilds.forEach(function(build) {
            //     const builder = $scope.builders.get(build.builderid);
            //     if (builder != null) {
            //         if (builder.builds == null) { builder.builds = []; }
            //         if (builder.builds.indexOf(build) < 0) {
            //             builder.builds.push(build);
            //             builder.builds.sort(byNumber);
            //         }
            //     }
            // });
            
            
            builder.getForceschedulers().onChange = function(forceschedulers)
            {
                builder.forceBuild = function () {
                    return $state.go("builder.forcebuilder",
                        {builder:builder.builderid,
                            scheduler:forceschedulers[0].name});
                };
            };
        };
    }
}


angular.module('app')
.controller('homeController', ['$scope', 'dataService', 'config', '$location', '$state', Home]);
