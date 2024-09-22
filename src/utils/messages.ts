import { Constants } from "../types/constants.js";

export class Messages {
    static BUFFER_INDEX_MSG_LEN: number = 1;
    static BUFFER_INDEX_MSG_TYPE: number = 2;
    static BUFFER_INDEX_CHANNEL_NUM: number = 3;
    static BUFFER_INDEX_MSG_DATA: number = 4;
    static BUFFER_INDEX_EXT_MSG_BEGIN: number = 12;

    static resetSystem(): Uint8Array {
        const payload: number[] = [];
        payload.push(0x00);
        return this.buildMessage(payload, Constants.MESSAGE_SYSTEM_RESET);
    }

    static requestMessage(channel: number, messageId: number): Uint8Array {
        let payload: number[] = [];
        payload = payload.concat(this.intToLEHexArray(channel));
        payload.push(messageId);
        return this.buildMessage(payload, Constants.MESSAGE_CHANNEL_REQUEST);
    }

    static setNetworkKey(): Uint8Array {
        const payload: number[] = [];
        payload.push(Constants.DEFAULT_NETWORK_NUMBER);
        payload.push(0xb9);
        payload.push(0xa5);
        payload.push(0x21);
        payload.push(0xfb);
        payload.push(0xbd);
        payload.push(0x72);
        payload.push(0xc3);
        payload.push(0x45);
        return this.buildMessage(payload, Constants.MESSAGE_NETWORK_KEY);
    }

    static assignChannel(channel: number, type = "receive"): Uint8Array {
        let payload: number[] = [];
        payload = payload.concat(this.intToLEHexArray(channel));
        if (type === "receive") {
            payload.push(Constants.CHANNEL_TYPE_TWOWAY_RECEIVE);
        } else if (type === "receive_only") {
            payload.push(Constants.CHANNEL_TYPE_ONEWAY_RECEIVE);
        } else if (type === "receive_shared") {
            payload.push(Constants.CHANNEL_TYPE_SHARED_RECEIVE);
        } else if (type === "transmit") {
            payload.push(Constants.CHANNEL_TYPE_TWOWAY_TRANSMIT);
        } else if (type === "transmit_only") {
            payload.push(Constants.CHANNEL_TYPE_ONEWAY_TRANSMIT);
        } else if (type === "transmit_shared") {
            payload.push(Constants.CHANNEL_TYPE_SHARED_TRANSMIT);
        } else {
            throw new Error("type not allowed");
        }
        payload.push(Constants.DEFAULT_NETWORK_NUMBER);
        return this.buildMessage(payload, Constants.MESSAGE_CHANNEL_ASSIGN);
    }

    static setDevice(channel: number, deviceId: number, deviceType: number, transmissionType: number): Uint8Array {
        let payload: number[] = [];
        payload = payload.concat(this.intToLEHexArray(channel));
        payload = payload.concat(this.intToLEHexArray(deviceId, 2));
        payload = payload.concat(this.intToLEHexArray(deviceType));
        payload = payload.concat(this.intToLEHexArray(transmissionType));
        return this.buildMessage(payload, Constants.MESSAGE_CHANNEL_ID);
    }

    static searchChannel(channel: number, timeout: number): Uint8Array {
        let payload: number[] = [];
        payload = payload.concat(this.intToLEHexArray(channel));
        payload = payload.concat(this.intToLEHexArray(timeout));
        return this.buildMessage(payload, Constants.MESSAGE_CHANNEL_SEARCH_TIMEOUT);
    }

    static setPeriod(channel: number, period: number): Uint8Array {
        let payload: number[] = [];
        payload = payload.concat(this.intToLEHexArray(channel));
        payload = payload.concat(this.intToLEHexArray(period));
        return this.buildMessage(payload, Constants.MESSAGE_CHANNEL_PERIOD);
    }

    static setFrequency(channel: number, frequency: number): Uint8Array {
        let payload: number[] = [];
        payload = payload.concat(this.intToLEHexArray(channel));
        payload = payload.concat(this.intToLEHexArray(frequency));
        return this.buildMessage(payload, Constants.MESSAGE_CHANNEL_FREQUENCY);
    }

    static setRxExt(): Uint8Array {
        let payload: number[] = [];
        payload = payload.concat(this.intToLEHexArray(0));
        payload = payload.concat(this.intToLEHexArray(1));
        return this.buildMessage(payload, Constants.MESSAGE_ENABLE_RX_EXT);
    }

    static libConfig(channel: number, how: number): Uint8Array {
        let payload: number[] = [];
        payload = payload.concat(this.intToLEHexArray(channel));
        payload = payload.concat(this.intToLEHexArray(how));
        return this.buildMessage(payload, Constants.MESSAGE_LIB_CONFIG);
    }

    static openRxScan(): Uint8Array {
        let payload: number[] = [];
        payload = payload.concat(this.intToLEHexArray(0));
        payload = payload.concat(this.intToLEHexArray(1));
        return this.buildMessage(payload, Constants.MESSAGE_CHANNEL_OPEN_RX_SCAN);
    }

    static openChannel(channel: number): Uint8Array {
        let payload: number[] = [];
        payload = payload.concat(this.intToLEHexArray(channel));
        return this.buildMessage(payload, Constants.MESSAGE_CHANNEL_OPEN);
    }

    static closeChannel(channel: number): Uint8Array {
        let payload: number[] = [];
        payload = payload.concat(this.intToLEHexArray(channel));
        return this.buildMessage(payload, Constants.MESSAGE_CHANNEL_CLOSE);
    }

    static unassignChannel(channel: number): Uint8Array {
        let payload: number[] = [];
        payload = payload.concat(this.intToLEHexArray(channel));
        return this.buildMessage(payload, Constants.MESSAGE_CHANNEL_UNASSIGN);
    }

    static acknowledgedData(channel: number, payload: number[]): Uint8Array {
        payload = this.intToLEHexArray(channel).concat(payload);
        return this.buildMessage(payload, Constants.MESSAGE_CHANNEL_ACKNOWLEDGED_DATA);
    }

    static broadcastData(channel: number, payload: number[]): Uint8Array {
        payload = this.intToLEHexArray(channel).concat(payload);
        return this.buildMessage(payload, Constants.MESSAGE_CHANNEL_BROADCAST_DATA);
    }

    static buildMessage(payload: number[] = [], messageId = 0x00): Uint8Array {
        const message: number[] = [];
        message.push(Constants.MESSAGE_TX_SYNC);
        message.push(payload.length);
        message.push(messageId);
        payload.forEach((byte) => {
            message.push(byte);
        });
        message.push(this.getChecksum(message));

        return new Uint8Array(message);
    }

    static intToLEHexArray(int: number, numBytes = 1): number[] {
        numBytes = numBytes || 1;
        const a: number[] = [];
        const hexString = this.decimalToHex(int, numBytes * 2);
        for (let i = hexString.length - 2; i >= 0; i -= 2) {
            a.push(parseInt(hexString.substr(i, 2), 16));
        }
        return a;
    }

    static decimalToHex(d: number, numDigits: number): string {
        let hex = Number(d).toString(16);
        numDigits = numDigits || 2;
        while (hex.length < numDigits) {
            hex = "0" + hex;
        }

        return hex;
    }

    static getChecksum(message: number[]): number {
        let checksum = 0;
        message.forEach((byte) => {
            checksum = (checksum ^ byte) % 0xff;
        });

        return checksum;
    }
}
