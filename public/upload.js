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
        this.file = file;
        this.url = url;
        this.box = box;
        this.name = file.name;
        this.progress = 0;
        this.webSocket = new WebSocket('ws://' + window.location.host + url);
        this.intervalID = 0;
        this.block = {};
        this.blockSize = 0;
        this.blockLeft = 0;
        this.cancelled = false;
        this.completed = false;
        this.start.call(this);
        this.cancel = this.cancel.bind(this);
    }

    cancel() {
        this.cancelled = true;
        //console.log(this.name, 'cancel');
        this.done();
        return this;
    }

    done() {
        //console.log(this.name, 'end');
        window.clearInterval(this.intervalID);
        this.webSocket.close();
        this.box.filesUploading.forEach((uploader, index) => {
            if (Object.is(uploader, this)) {
                this.box.filesUploading.splice(index, 1);
            }
        });
        this.box.refresh();
        return this;
    }
    error() {
        //console.log(this.name, 'error');
        window.clearInterval(intervalID);
        this.webSocket.close();
        this.progress = -1;
        this.box.refresh();
        return this;
    }

    refreshProgress() {
        this.progress = 1 - (this.webSocket.bufferedAmount + this.blockLeft * this.blockSize) / this.file.size;
        if (this.webSocket.bufferedAmount < this.blockSize) {
            this.sendNextBlock();
        }
        this.box.refresh();
        if (this.webSocket.bufferedAmount == 0) {
            this.completed = true;
            this.done();
        }
        return this;
    }

    sendNextBlock() {
        for (var blockNum in this.block.left) {
            var start = blockNum * this.block.size;
            var num = new Uint32Array(1);
            num[0] = blockNum;
            this.webSocket.send(new Blob([num, this.file.slice(start, start + this.block.size)]));
            this.blockLeft--;
            delete this.block.left[blockNum];
            return this;
        }
    }

    start() {
        this.webSocket.onerror = () => {
            this.error();
        };
        this.webSocket.onclose = () => {
            if (this.cancelled || this.completed) {
                return;
            }
            this.error();
        };
        this.webSocket.onopen = async () => {
            var hash = await md5(this.file);
            var fileStat = {
                name: this.file.name,
                md5: hash,
                size: this.file.size
            };
            this.webSocket.send(JSON.stringify(fileStat));
        };
        this.webSocket.onmessage = (event) => {
            this.block = JSON.parse(event.data);
            this.blockLeft = Object.keys(this.block.left).length;
            this.blockSize = this.block.size;
            this.intervalID = window.setInterval(this.refreshProgress.bind(this), 20);
        };
        return this;
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
