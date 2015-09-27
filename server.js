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

busboy.extend(app, {upload: true, path: 'tmp/'});
app.set('port', (process.env.PORT || 3000));

app.use('/', express.static(path.join(__dirname, 'public')));

app.get('/api/download', function (req, res) {
    fs.readdir('public/files', function (err, files) {
        files.forEach(function (element, index) {
            if (element.startsWith('.')) {
                files.splice(index, 1);
            }
        });
        res.setHeader('Cache-Control', 'no-cache');
        res.json(JSON.stringify(files));
    });
});

app.post('/api/upload', function (req, res) {
    for(var filename in req.files) {
        fs.rename(req.files[filename].file, 'public/files/' + filename);
    }
    res.end();
});


app.listen(app.get('port'), function () {
    console.log('Server started: http://localhost:' + app.get('port') + '/');
});
