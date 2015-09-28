class Uploader {
    constructor(file, url, box) {
        var self = this;
        this.name = file.name;
        this.progress = 0;
        this.webSocket = new WebSocket('ws://' + window.location.host + url);
        this.intervalID = 0;
        this.blockSize = 0;
        this.blockLeft = 0;
        this.cancel = function () {
            self.done();
        };
        this.error = function () {
            this.progress = -1;
        };
        this.done = function () {
            window.clearInterval(self.intervalID);
            self.webSocket.close();
            box.filesUploading.map(function (uploader, index) {
                if (Object.is(uploader, self)) {
                    box.filesUploading.splice(index, 1);
                    box.refresh();
                }
            });
            self = null;
        };
        this.refreshProgress = function () {
            console.log(self.webSocket.bufferedAmount, self.blockLeft, self.blockSize);
            self.progress = 1 - (self.webSocket.bufferedAmount + self.blockLeft * self.blockSize) / file.size;
            box.refresh();
            if (self.webSocket.bufferedAmount == 0) {
                self.done();
            }
        };
        this.start = function () {
            //TODO: browser cannot load all file to memory
            var reader = new FileReader(file);
            reader.readAsBinaryString(file);
            self.webSocket.onopen = function () {
                //console.log(file);
                reader.onload = function () {
                    var fileStat = {
                        name: file.name,
                        md5: CryptoJS.MD5(reader.result).toString(CryptoJS.enc.Hex),
                        size: file.size
                    };
                    self.webSocket.send(JSON.stringify(fileStat));
                }
            };
            self.webSocket.onmessage = function (event) {
                var block = JSON.parse(event.data);
                self.blockLeft = Object.keys(block.left).length;
                self.blockSize = block.size;
                self.intervalID = window.setInterval(self.refreshProgress, 20);
                for (var blockNum in block.left) {
                    var start = blockNum * block.size;
                    self.webSocket.send(file.slice(start, start + block.size));
                    self.blockLeft--;
                }
            };
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
            <div>{this.props.file.name} : {((this.props.file.progress) * 100).toFixed(0)} %
                <input type="button" onClick={this.props.file.cancel} value="cancel"/>
            </div>
        )
    }
});

React.render(
    <UploadBox url="/api/upload"/>, document.getElementById('upload')
);
