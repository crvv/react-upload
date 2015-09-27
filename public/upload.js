var UploadBox = React.createClass({
    Uploader: function (file, url, box) {
        var self = this;
        this.name = file.name;
        this.progress = 0;
        this.request = new XMLHttpRequest();
        this.cancel = function () {
            self.request.abort();
            self.done();
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
            var formData = new FormData();
            formData.append(self.name, file);
            self.request.send(formData);
        };
        this.start();
    },
    filesUploading: [],
    refresh: function () {
        this.setState({files: this.filesUploading});
    },
    handleUpload: function (files) {
        for (var i = 0; i < files.length; i++) {
            this.filesUploading.push(new this.Uploader(files[i], this.props.url, this))
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
    },
    render: function () {
        return (
            <div>
                <input type="file" ref="fileChooser" multiple={true}/>
                <input type="button" onClick={this.handleSubmit} value="Upload"/>
            </div>
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
            <div>{this.props.file.name}: {this.props.file.progress}
                <input type="button" onClick={this.props.file.cancel} value="cancel"/>
            </div>
        )
    }
});

React.render(
    <UploadBox url="/api/upload"/>,
    document.getElementById('upload')
);
