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
        $scope.buildsRunning = data.getBuilds({order: '-started_at', complete: false, property: ["owners"]});
        $scope.recentBuilds = data.getBuilds({order: '-buildid', complete: true, limit:20, property: ["owners"]});
        $scope.builders = data.getBuilders();
        $scope.hasBuilds = b => (b.builds != null ? b.builds.length : undefined) > 0;

        const updateBuilds = function() {
            const byNumber = (a, b) => a.number - b.number;

            $scope.buildsRunning.forEach(function(build) {
                const builder = $scope.builders.get(build.builderid);
                if (builder != null) {
                    if (builder.buildsRunning == null) { builder.buildsRunning = []; }
                    if (builder.buildsRunning.indexOf(build) < 0) {
                        builder.buildsRunning.push(build);
                        builder.buildsRunning.sort(byNumber);
                    }
                }
            });
            
            let forEach = $scope.recentBuilds.forEach(function(build) {
                const builder = $scope.builders.get(build.builderid);
                if (builder != null) {
                    if (builder.builds == null) { builder.builds = []; }
                    if (builder.builds.indexOf(build) < 0) {
                        builder.builds.push(build);
                        builder.builds.sort(byNumber);
                    }
                }
            });
            return forEach;
        };

        $scope.buildsRunning.onChange = updateBuilds;
        $scope.recentBuilds.onChange = updateBuilds;
        $scope.builders.onChange = updateBuilds;

        $scope.builders.onNew = function(builder) {
            builder.getForceschedulers().onChange = function(forceschedulers)
            {
                builder.forceBuild = function () {
                    return $state.go("builder.forcebuilder",
                        {builder:builder.builderid,
                            scheduler:forceschedulers[0].name});
                };
            };
        };

        let onNewBuild = function(build) {
            build.getProperties().onNew = function(properties)
            {
                build.buildProperties = properties;
            };
            data.getBuildrequests(build.buildrequestid).onNew = function(buildrequest) {
                data.getBuildsets(buildrequest.buildsetid).onNew = function(buildset) {
                    build.branch = buildset.sourcestamps[0].branch;
                    build.owner = build.properties.owners[0][0];
                };
            };
        };

        $scope.buildsRunning.onNew = onNewBuild;
        $scope.recentBuilds.onNew = onNewBuild;
    }
}


angular.module('app')
.controller('homeController', ['$scope', 'dataService', 'config', '$location', '$state', Home]);
