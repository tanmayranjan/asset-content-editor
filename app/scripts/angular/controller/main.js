/**
 * @author Santhosh Vasabhaktula <santhosh@ilimi.in>
 */
'use strict';

angular.module('editorApp', ['ngDialog', 'oc.lazyLoad', 'Scope.safeApply']).config(['$locationProvider', '$httpProvider', function($locationProvider, $httpProvider) {
    $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
    });
    $httpProvider.interceptors.push('apiTimeStamp');
}]);
angular.module('editorApp').controller('MainCtrl', ['$scope', '$timeout', '$http', '$location', '$q', '$window', '$document',
    function($scope, $timeout, $http, $location, $q, $window, $document) {

        // Declare global variables
        $scope.showAppLoadScreen = true;
        $scope.contentLoadedFlag = false;
        $scope.showGenieControls = false;
        $scope.developerMode = $location.search().developerMode;
        $scope.appLoadMessage = [
            { 'id': 1, 'message': 'Getting things ready for you', 'status': false }
        ];
        $scope.migrationFlag = false;
        $scope.saveBtnEnabled = true;
        $scope.model = {
            teacherInstructions: undefined
        }
        $scope.migration = {
            showMigrationError: false,
            showPostMigrationMsg: false,
            showMigrationSuccess: false
        }

        $scope.onLoadCustomMessage = {
            show: false,
            text: undefined
        }
        $scope.cancelLink = (($window.context && $window.context.cancelLink) ? $window.context.cancelLink : "");
        $scope.reportIssueLink = (($window.context && $window.context.reportIssueLink) ? $window.context.reportIssueLink : "");

        $scope.context = $window.context;
        $scope.contentId = $location.search().contentId;
        if (_.isUndefined($scope.contentId)) {
            $scope.contentId = (($window.context && $window.context.content_id) ? $window.context.content_id : undefined)
        }

        $scope.contentDetails = {
            contentTitle: "Untitled Content",
            contentImage: "/images/com_ekcontent/default-images/default-content.png",
            contentConcepts: "No concepts selected",
            contentType: ""
        };
        $scope.userDetails = !_.isUndefined(window.context) ? window.context.user : undefined;
        $scope.showInstructions = true;
        $scope.stageAttachments = {};

        // TODO: Figure out what the below code does
        EkstepEditorAPI.jQuery('.browse.item.at').popup({ on: 'click', setFluidWidth: false, position: 'bottom right' });

        // Functions
        $scope.closeLoadScreen = function(flag) {
            $scope.contentLoadedFlag = true;
            if (!$scope.migrationFlag || flag) {
                $scope.showAppLoadScreen = false;
            }
            $scope.$safeApply();
        }

        $scope.enableSave = function() {
            //$scope.saveBtnEnabled = true;
            //$scope.$safeApply();
        }

        $scope.previewContent = function(fromBeginning) {
            EkstepEditorAPI.getCanvas().deactivateAll().renderAll();
            var currentStage = _.isUndefined(fromBeginning) ? true : false;
            EkstepEditor.eventManager.dispatchEvent("atpreview:show", { contentBody: EkstepEditor.stageManager.toECML(), 'currentStage': currentStage });
            EkstepEditorAPI.dispatchEvent('config:settings:show', { id: $scope.currentStage.id });
        };

        $scope.saveContent = function() {
            if ($scope.saveBtnEnabled) {
                $scope.saveBtnEnabled = false;
                // TODO: Show saving dialog
                var contentBody = EkstepEditor.stageManager.toECML();
                $scope.patchContent({ stageIcons: JSON.stringify(EkstepEditor.stageManager.getStageIcons()) }, contentBody, function(err, res) {
                    if (res) $scope.saveNotification('success');
                    if (err) $scope.saveNotification('error'); 
                    $scope.saveBtnEnabled = true;                                                           
                });
            }
        }

        $scope.patchContent = function(metadata, body, cb) {
            if ($scope.migrationFlag) {
                if (!metadata) metadata = {};
                metadata.oldContentBody = $scope.oldContentBody;
                var migrationPopupCb = function() {
                    $scope.contentService.saveContent(EkstepEditorAPI.getContext('contentId'), metadata, body, cb);
                }
                $scope.showMigratedContentSaveDialog(migrationPopupCb);
            } else {
                $scope.contentService.saveContent(EkstepEditorAPI.getContext('contentId'), metadata, body, cb);
            }
        }

        $scope.toggleGenieControl = function() {
            if (!$scope.showGenieControls) {
                //Position the transparent image correctly on top of image
                var canvasOffset = EkstepEditorAPI.jQuery('#canvas').offset();
                setTimeout(function() {
                    EkstepEditorAPI.jQuery('#geniecontrols').offset({
                        "top": canvasOffset.top,
                        "left": canvasOffset.left,
                    });

                    EkstepEditorAPI.jQuery('#geniecontrols').css({
                        "display": 'block'
                    });
                }, 500);

            }
            $scope.showGenieControls = !$scope.showGenieControls;
        }

        $scope.convertToJSON = function(contentBody) {
            try {
                var x2js = new X2JS({ attributePrefix: 'none', enableToStringFunc: false });
                return x2js.xml_str2json(contentBody);
            } catch (e) {
                return;
            }
        }

        $scope.parseContentBody = function(contentBody) {
            try {
                contentBody = JSON.parse(contentBody);
            } catch (e) {
                contentBody = $scope.convertToJSON(contentBody);
            }
            if (_.isUndefined(contentBody) || _.isNull(contentBody)) {
                $scope.contentLoadedFlag = true;
                $scope.onLoadCustomMessage.show = true;
                $scope.onLoadCustomMessage.text = "Your content has errors! we are unable to read the content!";
                $scope.$safeApply();
                $scope.telemetryService.error({ "env": "content", "stage": "", "action": "show error and stop the application", "err": "Unable to read the content due to parse error", "type": "PORTAL", "data": "", "severity": "fatal" });
            };
            return contentBody;
        }

        $scope.onStageDragDrop = function(dragEl, dropEl) {
            EkstepEditor.stageManager.onStageDragDrop(EkstepEditor.jQuery('#' + dragEl).attr('data-id'), EkstepEditor.jQuery('#' + dropEl).attr('data-id'));
            EkstepEditorAPI.refreshStages();
        }

        $scope.editContentMeta = function() {
            var config = {
                template: 'editContentMetaDialog',
                controller: ['$scope', 'mainCtrlScope', function($scope, mainCtrlScope) {
                    $scope.routeToContentMeta = function(save) {
                        $scope.closeThisDialog();
                        mainCtrlScope.routeToContentMeta(save);
                    }
                }],
                resolve: {
                    mainCtrlScope: function() {
                        return $scope;
                    }
                },
                showClose: false
            };

            EkstepEditorAPI.getService('popup').open(config);
        }

        $scope.routeToContentMeta = function(save) {
            $scope.enableSave();
            if (save) {
                var contentBody = EkstepEditor.stageManager.toECML();
                $scope.patchContent({ stageIcons: JSON.stringify(EkstepEditor.stageManager.getStageIcons()) }, contentBody, function(err, res) {
                    if (res) {
                        $scope.saveNotification('success');
                        $window.location.assign(window.context.editMetaLink);                    
                    }
                    if (err) $scope.saveNotification('error');
                });
            } else {
                $window.location.assign(window.context.editMetaLink);
            }
        };

        $scope.saveNotification = function(message) {
            message = (message === 'success') ? 'saveSuccessMessage.html' : 'saveErrorMessage.html';
            var config = {
                template: message,
                showClose: false
            }
            $scope.popupService.open(config);
        };
        $scope.showMigratedContentSaveDialog = function(callback) {
            var instance = $scope;
            $scope.popupService.open({
                template: 'migratedContentSaveMsg.html',
                controller: ['$scope', function($scope) {
                    $scope.saveContent = function() {
                        instance.migrationFlag = false;
                        callback();
                    }

                    $scope.enableSaveBtn = function() {
                        instance.saveBtnEnabled = true;
                    }
                }],
                showClose: false,
                closeByDocument: false,
                closeByEscape: false
            });
        }

        /** 
         * Content Editor Initialization
         */
        // Set the context
        var context = {
            uid: $window.context.user.id,
            sid: $window.context.sid,
            contentId: $scope.contentId
        }
        // Config to override
        var config = {
            absURL: $location.protocol() + '://' + $location.host() + ':' + $location.port() // Required
        }

        /**
         * Load Content - Invoked once the content editor has loaded
         */
        $scope.loadContent = function() {
            EkstepEditorAPI.getService(ServiceConstants.CONTENT_SERVICE).getContent(EkstepEditorAPI.getContext('contentId'), function(err, content) {
                if (err) {
                    $scope.contentLoadedFlag = true;
                    $scope.onLoadCustomMessage.show = true;
                    $scope.onLoadCustomMessage.text = ":( Unable to fetch the content! Please try again later!";
                    $scope.telemetryService.error({ "env": "content", "stage": "", "action": "show error and stop the application", "err": "Unable to fetch content from remote", "type": "API", "data": err, "severity": "fatal" });
                }
                if (!(content && content.body) && !err) {
                    EkstepEditor.stageManager.onContentLoad((new Date()).getTime());
                    $scope.closeLoadScreen(true);
                } else if (content && content.body) {
                    $scope.oldContentBody = angular.copy(content.body);
                    var parsedBody = $scope.parseContentBody(content.body);
                    if (parsedBody) EkstepEditorAPI.dispatchEvent("content:migration:start", { body: parsedBody, stageIcons: content.stageIcons });
                }
                if (content) {
                    var concepts = "";
                    if (!_.isUndefined(content.concepts)) {
                        concepts = _.size(content.concepts) <= 1 ? content.concepts[0].name : content.concepts[0].name + ' & ' + (_.size(content.concepts) - 1) + ' more';
                    }
                    $scope.contentDetails = {
                        contentTitle: content.name,
                        contentImage: content.appIcon,
                        contentType: '| ' + content.contentType,
                        contentConcepts: concepts
                    };
                    $scope.setTitleBarText($scope.contentDetails.contentTitle);
                }
            });
        }
        /**
         * Initialize the ekstep editor
         * @param  {object} context The context for the editor to load
         * @param  {object} config The config for the editor to override/set
         * @param  {function} $scope Scope of the controller
         * @param  {function} callback Function to be invoked once the editor is loaded
         */
        EkstepEditor.init(context, config, $scope, $document, function() {
            var obj = _.find($scope.appLoadMessage, { 'id': 1 });
            if (_.isObject(obj)) {
                obj.message = "Getting things ready for you";
                obj.status = true;
            }
            $scope.contentService = EkstepEditorAPI.getService(ServiceConstants.CONTENT_SERVICE);
            $scope.popupService = EkstepEditorAPI.getService(ServiceConstants.POPUP_SERVICE);
            $scope.telemetryService = EkstepEditorAPI.getService(ServiceConstants.TELEMETRY_SERVICE);
            $scope.menus = EkstepEditor.toolbarManager.menuItems;
            $scope.contextMenus = EkstepEditor.toolbarManager.contextMenuItems;
            $scope.stages = EkstepEditorAPI.getAllStages();
            $scope.currentStage = EkstepEditorAPI.getCurrentStage();
            $scope.configMenus = $scope.configMenus || [];
            _.forEach(EkstepEditor.toolbarManager.configMenuItems,function (menu) {
                $scope.configMenus.push(menu);
            });

            $scope.loadContent();
            /* KeyDown event to show ECML */
            $document.on("keydown", function(event) {
                if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.keyCode == 69) { /*ctrl+shift+e or command+shift+e*/
                    event.preventDefault();
                    EkstepEditorAPI.dispatchEvent("org.ekstep.viewecml:show", {});
                }
            });
        });

        $scope.fireEvent = function(event) {
            if (event) EkstepEditorAPI.dispatchEvent(event.id, event.data);
        };

        $scope.setTitleBarText = function(text) {
            if (text) document.title = text;
        };

        $scope.fireToolbarTelemetry = function(menu, menuType) {
            $scope.telemetryService.interact({ "type": "click", "subtype": "menu", "target": menuType, "pluginid": '', 'pluginver': '', "objectid": menu.id, "stage": EkstepEditor.stageManager.currentStage.id });
        }

        $scope.fireSidebarTelemetry = function(menu, menuType) {
            var pluginId = "", pluginVer = "", objectId = "";
            var pluginObject = EkstepEditorAPI.getCurrentObject() || EkstepEditorAPI.getCurrentStage();
            if(pluginObject) {
                pluginId = pluginObject.manifest.id;
                pluginVer = pluginObject.manifest.ver;
                objectId = pluginObject.id;
            }
            $scope.telemetryService.interact({ "type": "modify", "subtype": "sidebar", "target": menuType, "pluginid": pluginId, 'pluginver': pluginVer, "objectid": objectId, "stage": EkstepEditor.stageManager.currentStage.id });
        }
    }
]);

EkstepEditor.jQuery(document).ready(function() {
    var newheight = $(window).innerHeight() - 114;  
    EkstepEditor.jQuery('.scrollable-slides').css("height",newheight + "px");  
});
