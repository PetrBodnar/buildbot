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
    constructor($scope, $interval, resultsService) {
        _.mixin($scope, resultsService);
        const stop = $interval(() => {
            if(!$scope.build)
                return;
            
            $interval.cancel(stop);

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
                    }
                }
            }
        }, 500);
        
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
.controller('_buildPropertiesController', ['$scope', '$interval', 'resultsService', _buildProperties]);
