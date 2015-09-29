async function md5(file) {
    var blockSize = 512 * 1024;
    var blockCount = file.size / blockSize;
    if (!Number.isInteger(blockCount)) {
        blockCount = Math.floor(blockCount) + 1;
    }
    var hasher = forge.md.md5.create();
    var readBlock = async (block) => {
        return new Promise((res, rej) => {
            var reader = new FileReader();
            reader.onloadend = () => {
                hasher.update(reader.result);
                res();
            };
            reader.onerror = () => {
                rej();
            };
            reader.readAsBinaryString(block);
        });
    };
    return new Promise(async (res, rej) => {
        for (var i = 0; i < blockCount; i++) {
            var start = i * blockSize;
            await readBlock(file.slice(start, start + blockSize));
        }
        var hash = hasher.digest().toHex();
        res(hash);
    });
}
class Uploader {

    constructor(file, url, box) {
        var self = this;
        this.name = file.name;
        this.progress = 0;
        this.webSocket = new WebSocket('ws://' + window.location.host + url);
        this.intervalID = 0;
        this.block = {};
        this.blockSize = 0;
        this.blockLeft = 0;
        this.error = () => {
            this.progress = -1;
        };
        this.cancel = ()  => {
            self.done();
        };
        this.done = () => {
            window.clearInterval(self.intervalID);
            self.webSocket.close();
            box.filesUploading.map((uploader, index) => {
                if (Object.is(uploader, self)) {
                    box.filesUploading.splice(index, 1);
                    box.refresh();
                }
            });
            self = null;
        };
        this.refreshProgress = () => {
            self.progress = 1 - (self.webSocket.bufferedAmount + self.blockLeft * self.blockSize) / file.size;
            if (self.webSocket.bufferedAmount < self.blockSize) {
                self.sendNextBlock();
            }
            box.refresh();
            if (self.webSocket.bufferedAmount == 0) {
                self.done();
            }
        };
        this.sendNextBlock = () => {
            for (var blockNum in self.block.left) {
                var start = blockNum * self.block.size;
                var num = new Uint32Array(1);
                num[0] = blockNum;
                self.webSocket.send(new Blob([num, file.slice(start, start + self.block.size)]));
                self.blockLeft--;
                delete self.block.left[blockNum];
                return;
            }
        };
        this.start = () => {
            self.webSocket.onerror = () => {
                self.error();
                self.webSocket.close();
            };
            self.webSocket.onopen = async () => {
                var hash = await md5(file);
                var fileStat = {
                    name: file.name,
                    md5: hash,
                    size: file.size
                };
                self.webSocket.send(JSON.stringify(fileStat));
            };
            self.webSocket.onmessage = (event) => {
                self.block = JSON.parse(event.data);
                self.blockLeft = Object.keys(self.block.left).length;
                self.blockSize = self.block.size;
                self.intervalID = window.setInterval(self.refreshProgress, 20);
            };
        };
        this.start();
    }
}

var UploadBox = React.createClass({
    filesUploading: [],
    refresh: function() {
        this.setState({files: this.filesUploading});
    },
    handleUpload: function(files) {
        for (var i = 0; i < files.length; i++) {
            this.filesUploading.push(new Uploader(files[i], this.props.url, this))
        }
        this.refresh();
    },
    getInitialState: function() {
        return {files: this.filesUploading};
    },

    render: function() {
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
    handleSubmit: function(e) {
        var filesToUpload = React.findDOMNode(this.refs.fileChooser);
        this.props.onClickUpload(filesToUpload.files);
        React.findDOMNode(this.refs.fileChooserForm).reset();
    },
    render: function() {
        return (
            <form ref="fileChooserForm">
                <input type="file" ref="fileChooser" multiple={true}/>
                <input type="button" onClick={this.handleSubmit} value="Upload"/>
            </form>
        );
    }
});
var ProgressList = React.createClass({
    render: function() {
        var progresses = this.props.data.map(function(uploader, index) {
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
    render: function() {
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
