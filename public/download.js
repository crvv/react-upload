var FileList = React.createClass({
    loadFileListFromServer: function () {
        $.ajax({
            url: this.props.url,
            dataType: 'json',
            cache: false,
            success: function (data) {
                data = JSON.parse(data);
                this.setState({data: data});
            }.bind(this),
            error: function (xhr, status, err) {
                console.error(status, err.toString());
            }.bind(this)
        });
    },
    getInitialState: function () {
        return {data: []};
    },
    componentDidMount: function () {
        this.loadFileListFromServer();
        setInterval(this.loadFileListFromServer, this.props.pollInterval);
    },
    render: function () {
        var files = this.state.data.map(function (file, index) {
            return (
                <File key={index} filename={file}></File>
            );
        });
        return (
            <div> {files} </div>
        );
    }
});
var File = React.createClass({
    render: function () {
        return (
            <div><a className="file" href={"/files/" + this.props.filename}>
                {this.props.filename}
            </a></div>
        );
    }
});
React.render(
    <FileList url="/api/download" pollInterval={2000}/>,
    document.getElementById('download')
);
