var express = require('express')
var app = express()
var fs = require('fs')

// Connect to mysql
var mysql = require('mysql')
var connection = mysql.createConnection({
	host : 'localhost',
	user : 'sensor',
	password : 'dudwns1729@',
	database : 'data'
});

connection.connect();	

//To Write the current time.
var dateTime = require('node-datetime');

//To Get IP addr.
var os = require('os');
var interfaces = os.networkInterfaces();
var addresses = [];
for (var k in interfaces) {
    for (var k2 in interfaces[k]) {
        var address = interfaces[k][k2];
        if (address.family === 'IPv4' && !address.internal) {
            addresses.push(address.address);
        }
    }
}
//console.log('came here1');
count=0; // the number of input temperature data after start server.

//Work with http call command
//Write the temperature record in local txt file and DB.
app.get('/', function(req,res){
	//consolo.log('came here2');	
	//Send the current time and temperature to Client.
	if(req.query.temp && typeof req.query.temp!='undefined'){

		var dt = dateTime.create();
		var formatted = dt.format('Y-m-d H:M:S');
		res.send(formatted+' Temp:'+req.query.temp);
		console.log(formatted+' Temp:'+req.query.temp);
	
		//Write to local TXT file.
		fs.appendFile('log.txt',req.query.temp+'\n', function(err){
			if(err) throw err;
		});
			
		data={};
		data.seq=count++;
		data.type='T';		//Means 'Temperature'
		data.device='102';	
		data.unit='0';
		data.ip=addresses;
		data.value=req.query.temp;
	
		//Insert data to DB by query 
		connection.query('INSERT INTO sensors SET ?',data,function(err,rows,cols){
			if(err) throw err;
		
			console.log('Insert Query Success');	
		});
	}
	else{
		res.send('Unauthorized Access');
	}
})

//Work with dump command
//Show recent 1440(one day) temperature records.
app.get('/dump',function(req,res){

	//Get Recent data from DB by query
	connection.query('SELECT * from sensors ORDER BY id DESC LIMIT 1440',function(err,rows,cols){
		if(err) throw err;
		
		res.write('<html><head><title>20141525</title></head><body>');		
		res.write('<p><h1>Capstone Design1 Mission#7.</h1></p>');
		
		var dt = dateTime.create();
		var formatted = dt.format('Y-m-d H:M:S');
		res.write('<p>Dump '+rows.length+' data at '+formatted+'</p>');
		
		//Parse data to send Client

		//Send HTML table
		res.write('<table border="0">');
		res.write('<tr><th>Count</th><th>Time</th><th>Temp</th></tr>');
		for(var i=0;i<rows.length;i++){
			var row=rows[i];
			res.write('<tr>');
			res.write('<td>'+i+'</td><td>'+row.time+'</td><td>'+row.value+'</td>');
			res.write('</tr>');
		}	
		res.end('</table></body></html>');
		console.log('Dump Success');
	});
})

app.get('/graph',function(req,res){
	console.log('Got app.get(graph)');
	var html = fs.readFile('./graph.html',function(err,html){
		html=" "+html;
		console.log('read file');

		var qstr = 'SELECT * from sensors where time >= date_sub(now(),INTERVAL 1 DAY) ORDER BY time';
		connection.query(qstr, function(err, rows, cols){
			if(err) throw err;
			
			var data="";
			var comma = "";
			for (var i=0; i<rows.length;i++){
				r = rows[i];
				var date=new Date(r.time).toLocaleString().split(' ');
				//console.log(date);
				var ymd=date[0].split('-');
				ymd[1] -= 1;
				var hms=date[1].split(':');
				data+=comma+"[new Date("+ymd[0]+","+ymd[1]+","+ymd[2]+","+hms[0]+","+hms[1]+","+hms[2]+"),"+r.value + "]";
				comma=",";
			}
			var header = "data.addColumn('date','Date/Time');";
			header+="data.addColumn('number','Temp');";
			html=html.replace("<%COLUMN%>",header);
			html=html.replace("<%DATA%>",data);

			res.writeHeader(200,{"Content-Type": "text/html"});
			res.write(html);
			res.end();			
		});
	});
})

app.listen(3000, function(){
	console.log('Temperature Measuring Program listening on port 3000!')
})
