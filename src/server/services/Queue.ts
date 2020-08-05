import { Connection, Channel, connect } from 'amqplib';
import { Options, Replies } from 'amqplib/properties';

export default class MessageQueue {

    connection?: any;
    connectionOptions?: Options.Connect;

    /**
     *
     */
    constructor() {
        this.connectionOptions = {
            username: process.env.RABBITMQUSERNAME,
            password: process.env.RABBITMQPASSWORD
        }
        this.connection = connect(this.connectionOptions); 
    }

    public async createChannelAndExchange(exchange: string, topic: string): Promise<Channel>{
      const channel: Channel = this.connection.createChannel();
      await channel.assertExchange(exchange, topic, {durable: true});
      return channel;
    }

    public publishToExchange(exchange: string, channel: Channel, key: string, message: string) {
      return channel.publish(exchange, key, Buffer.from(message), {persistent: true});
    }

    public async consumeFromExchange(exchange: string, topic: string, channel: Channel): Promise<any> {
      await channel.assertExchange(exchange, topic, {durable: true});
      const queue: Replies.AssertQueue = await channel.assertQueue('', { exclusive: true });
      await channel.bindQueue(queue.queue, exchange, topic);
      return await channel.consume(queue.queue, (msg) => {
        return msg?.content.toString();
      })
    }
}

