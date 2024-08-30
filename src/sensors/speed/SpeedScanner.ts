import { AntPlusScanner } from "../antPlusScanner.js";
import { updateState } from "./speedUtils.js";
import { SpeedScanState } from "./speedScanState.js";
import { SpeedSensor } from "./speedSensor.js";

export class SpeedScanner extends AntPlusScanner {
    protected deviceType() {
        return SpeedSensor.deviceType;
    }

    wheelCircumference: number = 2.199; // default 70cm wheel

    public setWheelCircumference(wheelCircumference: number) {
        this.wheelCircumference = wheelCircumference;
    }

    private states: { [id: number]: SpeedScanState } = {};

    protected createStateIfNew(deviceId: number) {
        if (!this.states[deviceId]) {
            this.states[deviceId] = new SpeedScanState(deviceId);
        }
    }

    protected updateRssiAndThreshold(deviceId: number, rssi: number, threshold: number) {
        this.states[deviceId].Rssi = rssi;
        this.states[deviceId].Threshold = threshold;
    }

    protected updateState(deviceId: number, data: Buffer) {
        updateState(this, this.states[deviceId], data);
    }
}
