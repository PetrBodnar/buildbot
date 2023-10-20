import moment from "moment/moment";

class BuildProperties {
    constructor() {
        return {
            replace: true,
            restrict: 'E',
            scope: {build: '=?', properties: "="},
            template: require('./buildProperties.tpl.jade'),
            controller: '_buildPropertiesController',
        };
    }
}

class _buildProperties {
    constructor($scope, $interval, resultsService, dataService) {
        _.mixin($scope, resultsService);
        $scope.$watch('properties', function() {
            if($scope.properties)
                $scope.fullUserName = $scope.properties.full_name;
        });
        $scope.$watch('build', function() {
            if($scope.build) {
                $scope.isBuildRequest = typeof $scope.build.submitted_at !== 'undefined';

                if(!$scope.isBuildRequest) {
                    $scope.build.getSteps().onNew = function (step) {
                        if (!step.complete || step.results > 1)
                            return

                        if (step.name == "upload IPA") {
                            $scope.ipaUrl = step.urls[0].url;
                        } else if (step.name == "upload APK") {
                            $scope.apkUrl = step.urls[0].url;
                        } else if (step.name == "upload OBB") {
                            $scope.obbUrl = step.urls[0].url;
                        } else if (step.name == "set build.zip url") {
                            $scope.steamBuildUrl = step.urls[0].url;
                        }
                    }
                }
            }
        });
        
        // const stop = $interval(() => {  
        //     if(!$scope.build)
        //         return;
        //     // if(!$scope.properties)
        //     //     return;
        //    
        //     $interval.cancel(stop);
        //
        //     $scope.fullUserName = $scope.properties.full_name;
        //     // const data = dataService.open().closeOnDestroy($scope);
        //     // let pguserid = $scope.properties.owners ? $scope.properties.owners[0][0].split('@')[0] : "";
        //     // data.getPgusers(pguserid).onNew = function(pguser) {
        //     //     $scope.fullUserName = pguser.full_name;
        //     // }
        //    
        //    
        // }, 250);
        
        $scope.copy = function (value, jsonify = true) {
            if (jsonify)
                value = JSON.stringify(value);

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(value);
            } else {
                var element = document.createElement('textarea');
                element.style = 'position:absolute; width:1px; height:1px; top:-10000px; left:-10000px';
                element.value = value;
                document.body.appendChild(element);
                element.select();
                document.execCommand('copy');
                document.body.removeChild(element);
            }
        }
    }
}


angular.module('common')
.directive('buildProperties', [BuildProperties])
.controller('_buildPropertiesController', ['$scope', '$interval', 'resultsService', 'dataService', _buildProperties]);
