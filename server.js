/**
 * This file provided by Facebook is for non-commercial testing and evaluation
 * purposes only. Facebook reserves all rights not expressly granted.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * FACEBOOK BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var fs = require('fs');
var path = require('path');
var express = require('express');
var busboy = require('express-busboy');
var app = express();
var expressWs = require('express-ws')(app);

var fileDir = path.join(__dirname, 'public/files');
var tmpDir = path.join(fileDir, 'tmp');
busboy.extend(app, {upload: true, path: 'tmp/'});
app.set('port', (process.env.PORT || 3000));

app.use('/', express.static(path.join(__dirname, 'public')));

app.get('/api/download', function (req, res) {
    fs.readdir(fileDir, function (err, files) {
        files.forEach(function (element, index) {
            if (element.startsWith('.') || element === 'tmp') {
                files.splice(index, 1);
            }
        });
        res.setHeader('Cache-Control', 'no-cache');
        res.json(JSON.stringify(files));
    });
});

app.ws('/api/upload', function (ws, req) {
    var file = null;
    var fileStat;
    var progressFilename;
    var partFilename;
    var blocks = {
        size: 0,
        left: {}
    };
    var left = 0;
    var writeToFile = function (msg) {
        if (file == null) {
            file = fs.openSync(partFilename, 'w')
        }
        fs.write(file, msg, function (err, written, string) {
            console.log(err, written, string);
        });
        left--;
        if (left == 0) {
            console.log('close');
            fs.closeSync(file);
        }
    };
    ws.on('message', function (msg) {
        if (blocks.size > 0) {
            writeToFile(msg);
            return;
        }
        fileStat = JSON.parse(msg);
        progressFilename = path.join(tmpDir, fileStat.md5);
        partFilename = progressFilename + '.part';
        fs.access(progressFilename, fs.F_OK, function (err) {
            if (err) {
                blocks.size = 512 * 1024;
                var blockCount = fileStat.size / blocks.size;
                if (!Number.isInteger(blockCount)) {
                    blockCount = Math.floor(blockCount) + 1;
                }
                for (var i = 0; i < blockCount; i++) {
                    blocks.left[i] = 1;
                }
            } else {
                fs.readFile(progressFilename, function (err, data) {
                    blocks = JSON.parse(data);
                });
            }
            left = Object.keys(blocks.left).length;
            ws.send(JSON.stringify(blocks));
        });
    });
});


app.listen(app.get('port'), function () {
    console.log('Server started: http://localhost:' + app.get('port') + '/');
});
