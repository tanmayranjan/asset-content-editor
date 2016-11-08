window.EkstepEditor.previewContent = function() {    
    var previewContentIframe = EkstepEditor.jQuery('#previewContentIframe')[0],
        config = { "showStartPage": true, "showEndPage": true };

    previewContentIframe.src = EkstepEditor.configService.previewReverseProxyUrl;

    previewContentIframe.onload = function() {
        var url = EkstepEditor.configService.learningServiceBaseUrl + "/v2/content/do_10096674";
        EkstepEditor.httpService().get(url).then(function(response) {
            onPreviewContentIframeLoad(response);
        });
    };

    function onPreviewContentIframeLoad(response) {
        var data = EkstepEditorAPI.contentService.getContent();        
        previewContentIframe.contentWindow.setContentData(response.data.result.content, data, config);
    };
}