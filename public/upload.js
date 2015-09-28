class Uploader {
    constructor(file, url, box) {
        var self = this;
        this.name = file.name;
        this.progress = 0;
        this.request = new XMLHttpRequest();
        this.cancel = function () {
            self.request.abort();
            self.done();
        };
        this.error = function () {
            this.progress = -1;
        };
        this.done = function () {
            box.filesUploading.map(function (uploader, index) {
                if (Object.is(uploader, self)) {
                    box.filesUploading.splice(index, 1);
                    box.refresh();
                }
            })
        };
        this.start = function () {
            self.request.open('POST', url, true);
            self.request.upload.addEventListener('progress', function (event) {
                self.progress = event.loaded / event.total;
                box.refresh();
            });
            self.request.upload.addEventListener('load', function (event) {
                self.done();
            });
            self.request.upload.addEventListener('error', function (event) {
                self.error();
                box.refresh();
            });
            var formData = new FormData();
            formData.append(self.name, file);
            self.request.send(formData);
        };
        this.start();
    }
}

var UploadBox = React.createClass({
    filesUploading: [],
    refresh: function () {
        this.setState({files: this.filesUploading});
    },
    handleUpload: function (files) {
        for (var i = 0; i < files.length; i++) {
            this.filesUploading.push(new Uploader(files[i], this.props.url, this))
        }
        this.refresh();
    },
    getInitialState: function () {
        return {files: this.filesUploading};
    },

    render: function () {
        return (
            <div>
                <h1>Upload</h1>
                <FileSelector onClickUpload={this.handleUpload}/>
                <ProgressList data={this.state.files}/>
            </div>
        );
    }
});
var FileSelector = React.createClass({
    handleSubmit: function (e) {
        var filesToUpload = React.findDOMNode(this.refs.fileChooser);
        this.props.onClickUpload(filesToUpload.files);
        React.findDOMNode(this.refs.fileChooserForm).reset();
    },
    render: function () {
        return (
            <form ref="fileChooserForm">
                <input type="file" ref="fileChooser" multiple={true}/>
                <input type="button" onClick={this.handleSubmit} value="Upload"/>
            </form>
        );
    }
});
var ProgressList = React.createClass({
    render: function () {
        var progresses = this.props.data.map(function (uploader, index) {
            return (
                <Progress key={index} file={uploader}></Progress>
            );
        });
        return (
            <div> {progresses} </div>
        );
    }
});
var Progress = React.createClass({
    render: function () {
        return (
            <div>{this.props.file.name} :  {((this.props.file.progress) * 100).toFixed(0)} %
                <input type="button" onClick={this.props.file.cancel} value="cancel"/>
            </div>
        )
    }
});

React.render(
    <UploadBox url="/api/upload"/>, document.getElementById('upload')
);
