import { Connection, Channel } from 'amqplib';
import { Options } from 'amqplib/properties';

class RabbitMQ {

    connection: any;

    /**
     *
     */
    constructor() {
        connectionOptions: Options.Connect = {
            username: process.env.RABBITMQUSERNAME, password: process.env.RABBITMQPASSWORD
        }
        this.connection = connect(connectionOptions);   
    }

    private createChannel(){
      
    }

    
}

//receive
amqp.connect({username: "user", password: "password"}, function(error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function(error1, channel) {
    if (error1) {
      throw error1;
    }
    let queue = 'hello';

    channel.assertQueue(queue, {
      durable: false
    });

    console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", queue);
    channel.consume(queue, function(msg) {
    console.log(" [x] Received %s", msg!!.content.toString());
    }, {
        noAck: true
    });

  });
  
});

//send
amqp.connect({username: "user", password: "password"}, function(error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function(error1, channel) {
    if (error1) {
      throw error1;
    }
    var queue = 'hello';
    var msg = 'Hello world';

    channel.assertQueue(queue, {
      durable: false
    });

    channel.sendToQueue(queue, Buffer.from(msg));
    console.log(" [x] Sent %s", msg);

    setTimeout(function() { 
        connection.close(); 
        process.exit(0) 
        }, 500);
  });
});



