class Pguser {
    constructor(Base, dataService) {
        let PguserInstance;
        return (PguserInstance = class PguserInstance extends Base {
            constructor(object, endpoint) {
                const endpoints = [
                ];

                super(object, endpoint, endpoints);
            }
        });
    }
}


angular.module('bbData')
.factory('Pguser', ['Base', 'dataService', Pguser]);
