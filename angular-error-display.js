(function() {
  /*
  Once I'm confident that this code will handle our error display needs, I'll move it to its 
  own repo and include it via bower
  */
'use strict';

angular.module('ngErrorDisplay', [])
.provider('errorMessageService', function() {
  var errors = {}, template;
  this.errors = function(_errors) {
    if (_errors) {
      errors = _errors;
    }
    return errors;
  };
  this.template = function(_template) {
    if (_template) {
      template = '<span ng-if="hasError && showErrors" class="ng-error-display">' + _template + '</span>';
    }
    return template;
  };
  this.$get = ['$rootScope',function($rootScope) {
    var tokens;
    return {
      tokens: function() {
        return tokens;
      },
      errorMessage: function(errorKey) {
        return errors[errorKey];
      },
      template: function() {
        return template;
      },
      showErrors: function(token) {
        if (token === undefined) {
          tokens = [true];
        } else if (angular.isArray(token)) {
          tokens = token;
        } else {
          tokens = [token];
        }
      },
      hideErrors: function() {
        tokens = false;
      }
    };
  }];
  this.template("<span class='help-block'>{{errorMessage}}</span>");
}) 
.directive('displayErrors', ['$compile','$timeout','errorMessageService','$log',
function($compile, $timeout, errorMessageService, $log) {
  return {
    restrict: 'A',
    require: 'ngModel',
    scope: false,
    link: function($scope, element, attrs, ngModel) {
      var errorOverrides;
      var children = {}; //an associative array of child scopes and their watches
      var watch;
      var errorTarget;
      var linkFn = $compile(angular.element(errorMessageService.template()));
      var eventVal;
      if (attrs.errorTarget) {
        errorTarget = element.parents(attrs.errorTarget)[0];
      } else {
        errorTarget = element.parent();
      }
      errorTarget = angular.element(errorTarget);
      var showErrors = function() {
        $scope.showErrors = true;
        errorOverrides = errorOverrides || $scope.$eval(attrs.errorMessages) || {};
        var addErrorClass;
        watch = watch || $scope.$watch(function() {
          return [ngModel.$error, errorMessageService.tokens()];
        }, function(vals) {
          var errorKey = vals[1];
          addErrorClass = false;
          _.each(ngModel.$error, function(val, key) {
            if (val && _(errorKey).find(function(errorKey) {
                return errorKey === true || errorKey == key;
              })) {
              addErrorClass = true;
            }
            var child = children[key];
            if (!child) {
              child = {scope: $scope.$new()};
              children[key] = child;
              child.scope.hasError = val && _(errorKey).find(function(errorKey) {
                return errorKey === true || errorKey == key;
              });
              child.scope.errorMessage = errorOverrides[key] !== undefined ? 
                errorOverrides[key] : errorMessageService.errorMessage(key);
              errorTarget.append(linkFn(child.scope));
            }

            $log.debug('Child', attrs.ngModel, 'watching for', eventVal);
            child.watch = child.watch || child.scope.$watch(function() {
                return [ngModel.$error[key], errorMessageService.tokens()];
              }, function(vals) {
                var error = vals[0];
                var errorKey = vals[1];
                child.scope.hasError = error && _(errorKey).find(function(errorKey) {
                  return errorKey === true || errorKey == key;
                });
                $log.debug('Watch called on', attrs.ngModel, 'for key', vals[1], 'with', vals[0], '. Result:', child.scope.hasError);
              }, true);
          });
          if (addErrorClass) {
            errorTarget.addClass('has-error');
          } else {
            errorTarget.removeClass('has-error');
          }
        
        }, true);
      };
      showErrors();
    }
  };
}]);

})();