import { nanoid } from "nanoid";
import amqp from "amqplib";

export class AmqpRequest {
  constructor() {
    this.correlationMap = new Map();
    this.currentState = new AmqpDisconnected(this);
  }

  initialize() {
    return this.currentState.initialize();
  }

  close() {
    this.channel.close();
    this.connection.close();
  }

  send(queue, data) {
    return this.currentState.send(queue, data);
  }
}

// Logic for disconnected state
class AmqpDisconnected {
  constructor(amqpRequest) {
    this.amqpRequest = amqpRequest;
    this.queue = [];
  }

  async initialize() {
    this.amqpRequest.connection = await amqp.connect("amqp://localhost");
    this.amqpRequest.channel =
      await this.amqpRequest.connection.createChannel();
    this.amqpRequest.replyQueue = (
      await this.amqpRequest.channel.assertQueue("", { exclusive: true })
    ).queue;
    
    this.amqpRequest.currentState = new AmqpConnected(this.amqpRequest);
    this.queue.forEach((cb) => cb());
    this.queue = [];
    this.amqpRequest.currentState.initialize();
  }

  send(queue, data) {
    return new Promise((res, rej) => {
      const command = () => {
        return Promise.resolve(this.amqpRequest.send(queue, data)).then(
          res,
          rej
        );
      };

      this.queue.push(command);
    });
  }
}

// Logic for connected state
class AmqpConnected {
  constructor(amqpRequest) {
    this.amqpRequest = amqpRequest;
  }

  initialize() {
    console.log('Connected and listening');
    this.amqpRequest.channel.consume(
      this.amqpRequest.replyQueue,
      (msg) => {
        const message = JSON.parse(msg.content.toString());
        const id = msg.properties.correlationId;
        console.log(message);
        const callback = this.amqpRequest.correlationMap.get(id);
        callback && callback(message);
      },
      { noAck: true }
    );
  }

  send(queue, data) {
    return new Promise((resolve, reject) => {
      const correlationId = nanoid();
      const timeout = setTimeout(() => {
        this.amqpRequest.correlationMap.delete(correlationId);
        reject(new Error("Request Timeout"));
      }, 10000);

      this.amqpRequest.correlationMap.set(correlationId, (message) => {
        clearTimeout(timeout);
        this.amqpRequest.correlationMap.delete(correlationId);
        resolve(message);
      });
      
      this.amqpRequest.channel.sendToQueue(
        queue,
        Buffer.from(JSON.stringify(data)),
        {
          correlationId,
          replyTo: this.amqpRequest.replyQueue,
        }
      );
    });
  }
}
