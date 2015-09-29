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
var app = express();
var expressWs = require('express-ws')(app);

var fileDir = path.join(__dirname, 'public/files');
var tmpDir = path.join(fileDir, 'tmp');
app.set('port', (process.env.PORT || 3000));

app.use('/', express.static(path.join(__dirname, 'public')));

app.get('/api/download', (req, res) => {
    fs.readdir(fileDir, (err, files) => {
        for (var i = files.length - 1; i >= 0; i--) {
            if (files[i].startsWith('.') || files[i] === 'tmp') {
                files.splice(i, 1);
            }
        }
        res.setHeader('Cache-Control', 'no-cache');
        res.json(JSON.stringify(files));
    });
});

app.ws('/api/upload', (ws, req) => {
    var file = null;
    var fileStat;
    var progressFilename;
    var partFilename;
    var filename;
    var blocks = {
        size: 0,
        left: {}
    };
    var writeToFile = (msg) => {
        if (file == null) {
            file = fs.openSync(partFilename, 'a');
        }
        var num = msg.readUInt32LE(0);
        fs.writeSync(file, msg, 4, msg.length - 4, num * blocks.size);
        delete blocks.left[num];
    };
    ws.on('close', () => {
        if (file != null) {
            fs.closeSync(file);
            if (Object.keys(blocks.left).length == 0) {
                fs.rename(partFilename, filename, (err) => {
                    if (err != null) {
                        console.log(err);
                    }
                });
                fs.unlink(progressFilename, (err) => {
                    //ignore 'no such file or directory' exception
                });
            } else {
                fs.writeFileSync(progressFilename, JSON.stringify(blocks));
            }
        }
    });
    ws.on('message', (msg) => {
        if (blocks.size > 0) {
            writeToFile(msg);
            return;
        }
        fileStat = JSON.parse(msg);
        progressFilename = path.join(tmpDir, fileStat.md5);
        partFilename = progressFilename + '.part';
        filename = path.join(fileDir, fileStat.name);
        fs.access(progressFilename, fs.F_OK, (err) => {
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
                blocks = JSON.parse(fs.readFileSync(progressFilename));
            }
            ws.send(JSON.stringify(blocks));
        });
    });
});


app.listen(app.get('port'), () => {
    console.log('Server started: http://localhost:' + app.get('port') + '/');
});
