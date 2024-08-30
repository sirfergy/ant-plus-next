/*
 * ANT+ profile: https://www.thisisant.com/developer/ant-plus/device-profiles/#521_tab
 * Spec sheet: https://www.thisisant.com/resources/bicycle-power/
 */

import { Messages } from "../../utils/messages.js";
import { FitnessEquipmentSensorState } from "./fitnessEquipmentSensorState.js";
import { FitnessEquipmentScanState } from "./fitnessEquipmentScanState.js";
import { FitnessEquipmentSensor } from "./fitnessEquipmentSensor.js";
import { FitnessEquipmentScanner } from "./fitnessEquipmentScanner.js";

function resetState(state: FitnessEquipmentSensorState | FitnessEquipmentScanState) {
    delete state.ElapsedTime;
    delete state.Distance;
    delete state.RealSpeed;
    delete state.VirtualSpeed;
    delete state.HeartRate;
    delete state.HeartRateSource;
    delete state.CycleLength;
    delete state.Incline;
    delete state.Resistance;
    delete state.METs;
    delete state.CaloricBurnRate;
    delete state.Calories;
    delete state._EventCount0x19;
    delete state._EventCount0x1A;
    delete state.Cadence;
    delete state.AccumulatedPower;
    delete state.InstantaneousPower;
    delete state.AveragePower;
    delete state.TrainerStatus;
    delete state.TargetStatus;
    delete state.AscendedDistance;
    delete state.DescendedDistance;
    delete state.Strides;
    delete state.Strokes;
    delete state.WheelTicks;
    delete state.WheelPeriod;
    delete state.Torque;
}

export function updateState(sensor: FitnessEquipmentSensor | FitnessEquipmentScanner, state: FitnessEquipmentSensorState | FitnessEquipmentScanState, data: Buffer) {
    const page = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA);
    switch (page) {
        case 0x01: {
            const temperature = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
            if (temperature !== 0xff) {
                state.Temperature = -25 + temperature * 0.5;
            }
            const calBF = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 1);
            if (calBF & 0x40) {
                state.ZeroOffset = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 4);
            }
            if (calBF & 0x80) {
                state.SpinDownTime = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 6);
            }
            break;
        }
        case 0x10: {
            const equipmentTypeBF = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 1);
            switch (equipmentTypeBF & 0x1f) {
                case 19:
                    state.EquipmentType = "Treadmill";
                    break;
                case 20:
                    state.EquipmentType = "Elliptical";
                    break;
                case 21:
                    state.EquipmentType = "Reserved";
                    break;
                case 22:
                    state.EquipmentType = "Rower";
                    break;
                case 23:
                    state.EquipmentType = "Climber";
                    break;
                case 24:
                    state.EquipmentType = "NordicSkier";
                    break;
                case 25:
                    state.EquipmentType = "Trainer/StationaryBike";
                    break;
                default:
                    state.EquipmentType = "General";
                    break;
            }
            let elapsedTime = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 2);
            let distance = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
            const speed = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 4);
            const heartRate = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 6);
            const capStateBF = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 7);
            if (heartRate !== 0xff) {
                switch (capStateBF & 0x03) {
                    case 3: {
                        state.HeartRate = heartRate;
                        state.HeartRateSource = "HandContact";
                        break;
                    }
                    case 2: {
                        state.HeartRate = heartRate;
                        state.HeartRateSource = "EM";
                        break;
                    }
                    case 1: {
                        state.HeartRate = heartRate;
                        state.HeartRateSource = "ANT+";
                        break;
                    }
                    default: {
                        delete state.HeartRate;
                        delete state.HeartRateSource;
                        break;
                    }
                }
            }

            elapsedTime /= 4;
            const oldElapsedTime = (state.ElapsedTime || 0) % 64;
            if (elapsedTime !== oldElapsedTime) {
                if (oldElapsedTime > elapsedTime) {
                    //Hit rollover value
                    elapsedTime += 64;
                }
            }
            state.ElapsedTime = (state.ElapsedTime || 0) + elapsedTime - oldElapsedTime;

            if (capStateBF & 0x04) {
                const oldDistance = (state.Distance || 0) % 256;
                if (distance !== oldDistance) {
                    if (oldDistance > distance) {
                        //Hit rollover value
                        distance += 256;
                    }
                }
                state.Distance = (state.Distance || 0) + distance - oldDistance;
            } else {
                delete state.Distance;
            }
            if (capStateBF & 0x08) {
                state.VirtualSpeed = speed / 1000;
                delete state.RealSpeed;
            } else {
                delete state.VirtualSpeed;
                state.RealSpeed = speed / 1000;
            }
            switch ((capStateBF & 0x70) >> 4) {
                case 1:
                    state.State = "OFF";
                    break;
                case 2:
                    state.State = "READY";
                    resetState(state);
                    break;
                case 3:
                    state.State = "IN_USE";
                    break;
                case 4:
                    state.State = "FINISHED";
                    break;
                default:
                    delete state.State;
                    break;
            }
            if (capStateBF & 0x80) {
                // lap
            }
            break;
        }
        case 0x11: {
            const cycleLen = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
            const incline = data.readInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 4);
            const resistance = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 6);
            const capStateBF = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 7);
            if (cycleLen !== 0xff) {
                state.CycleLength = cycleLen / 100;
            }
            if (incline >= -10000 && incline <= 10000) {
                state.Incline = incline / 100;
            }
            if (resistance !== 0xff) {
                state.Resistance = resistance;
            }
            switch ((capStateBF & 0x70) >> 4) {
                case 1:
                    state.State = "OFF";
                    break;
                case 2:
                    state.State = "READY";
                    resetState(state);
                    break;
                case 3:
                    state.State = "IN_USE";
                    break;
                case 4:
                    state.State = "FINISHED";
                    break;
                default:
                    delete state.State;
                    break;
            }
            if (capStateBF & 0x80) {
                // lap
            }
            break;
        }
        case 0x12: {
            const mets = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 2);
            const caloricbr = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 4);
            const calories = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 6);
            const capStateBF = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 7);
            if (mets !== 0xffff) {
                state.METs = mets / 100;
            }
            if (caloricbr !== 0xffff) {
                state.CaloricBurnRate = caloricbr / 10;
            }
            if (capStateBF & 0x01) {
                state.Calories = calories;
            }
            switch ((capStateBF & 0x70) >> 4) {
                case 1:
                    state.State = "OFF";
                    break;
                case 2:
                    state.State = "READY";
                    resetState(state);
                    break;
                case 3:
                    state.State = "IN_USE";
                    break;
                case 4:
                    state.State = "FINISHED";
                    break;
                default:
                    delete state.State;
                    break;
            }
            if (capStateBF & 0x80) {
                // lap
            }
            break;
        }
        case 0x13: {
            const cadence = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 4);
            let negDistance = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 5);
            let posDistance = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 6);
            const flagStateBF = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 7);

            if (cadence !== 0xff) {
                state.Cadence = cadence;
            }

            if (flagStateBF & 0x02) {
                const oldNegDistance = (state.DescendedDistance || 0) % 256;
                if (negDistance !== oldNegDistance) {
                    if (oldNegDistance > negDistance) {
                        negDistance += 256;
                    }
                }
                state.DescendedDistance = (state.DescendedDistance || 0) + negDistance - oldNegDistance;
            }

            if (flagStateBF & 0x01) {
                const oldPosDistance = (state.AscendedDistance || 0) % 256;
                if (posDistance !== oldPosDistance) {
                    if (oldPosDistance > posDistance) {
                        posDistance += 256;
                    }
                }
                state.AscendedDistance = (state.AscendedDistance || 0) + posDistance - oldPosDistance;
            }

            switch ((flagStateBF & 0x70) >> 4) {
                case 1:
                    state.State = "OFF";
                    break;
                case 2:
                    state.State = "READY";
                    resetState(state);
                    break;
                case 3:
                    state.State = "IN_USE";
                    break;
                case 4:
                    state.State = "FINISHED";
                    break;
                default:
                    delete state.State;
                    break;
            }
            if (flagStateBF & 0x80) {
                // lap
            }

            break;
        }
        case 0x14: {
            let posDistance = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 2);
            let strides = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
            const cadence = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 4);
            const power = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 5);
            const flagStateBF = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 7);

            if (cadence !== 0xff) {
                state.Cadence = cadence;
            }

            if (power !== 0xffff) {
                state.InstantaneousPower = power;
            }

            if (flagStateBF & 0x02) {
                const oldPosDistance = (state.AscendedDistance || 0) % 256;
                if (posDistance !== oldPosDistance) {
                    if (oldPosDistance > posDistance) {
                        posDistance += 256;
                    }
                }
                state.AscendedDistance = (state.AscendedDistance || 0) + posDistance - oldPosDistance;
            }

            if (flagStateBF & 0x01) {
                const oldStrides = (state.Strides || 0) % 256;
                if (strides !== oldStrides) {
                    if (oldStrides > strides) {
                        strides += 256;
                    }
                }
                state.Strides = (state.Strides || 0) + strides - oldStrides;
            }

            switch ((flagStateBF & 0x70) >> 4) {
                case 1:
                    state.State = "OFF";
                    break;
                case 2:
                    state.State = "READY";
                    resetState(state);
                    break;
                case 3:
                    state.State = "IN_USE";
                    break;
                case 4:
                    state.State = "FINISHED";
                    break;
                default:
                    delete state.State;
                    break;
            }
            if (flagStateBF & 0x80) {
                // lap
            }

            break;
        }
        case 0x16: {
            let strokes = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
            const cadence = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 4);
            const power = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 5);
            const flagStateBF = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 7);

            if (cadence !== 0xff) {
                state.Cadence = cadence;
            }

            if (power !== 0xffff) {
                state.InstantaneousPower = power;
            }

            if (flagStateBF & 0x01) {
                const oldStrokes = (state.Strokes || 0) % 256;
                if (strokes !== oldStrokes) {
                    if (oldStrokes > strokes) {
                        strokes += 256;
                    }
                }
                state.Strokes = (state.Strokes || 0) + strokes - oldStrokes;
            }

            switch ((flagStateBF & 0x70) >> 4) {
                case 1:
                    state.State = "OFF";
                    break;
                case 2:
                    state.State = "READY";
                    resetState(state);
                    break;
                case 3:
                    state.State = "IN_USE";
                    break;
                case 4:
                    state.State = "FINISHED";
                    break;
                default:
                    delete state.State;
                    break;
            }
            if (flagStateBF & 0x80) {
                // lap
            }

            break;
        }
        case 0x17: {
            let strides = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
            const cadence = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 4);
            const power = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 5);
            const flagStateBF = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 7);

            if (cadence !== 0xff) {
                state.Cadence = cadence;
            }

            if (power !== 0xffff) {
                state.InstantaneousPower = power;
            }

            if (flagStateBF & 0x01) {
                const oldStrides = (state.Strides || 0) % 256;
                if (strides !== oldStrides) {
                    if (oldStrides > strides) {
                        strides += 256;
                    }
                }
                state.Strides = (state.Strides || 0) + strides - oldStrides;
            }

            switch ((flagStateBF & 0x70) >> 4) {
                case 1:
                    state.State = "OFF";
                    break;
                case 2:
                    state.State = "READY";
                    resetState(state);
                    break;
                case 3:
                    state.State = "IN_USE";
                    break;
                case 4:
                    state.State = "FINISHED";
                    break;
                default:
                    delete state.State;
                    break;
            }
            if (flagStateBF & 0x80) {
                // lap
            }

            break;
        }
        case 0x18: {
            let strides = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
            const cadence = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 4);
            const power = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 5);
            const flagStateBF = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 7);

            if (cadence !== 0xff) {
                state.Cadence = cadence;
            }

            if (power !== 0xffff) {
                state.InstantaneousPower = power;
            }

            if (flagStateBF & 0x01) {
                const oldStrides = (state.Strides || 0) % 256;
                if (strides !== oldStrides) {
                    if (oldStrides > strides) {
                        strides += 256;
                    }
                }
                state.Strides = (state.Strides || 0) + strides - oldStrides;
            }

            switch ((flagStateBF & 0x70) >> 4) {
                case 1:
                    state.State = "OFF";
                    break;
                case 2:
                    state.State = "READY";
                    resetState(state);
                    break;
                case 3:
                    state.State = "IN_USE";
                    break;
                case 4:
                    state.State = "FINISHED";
                    break;
                default:
                    delete state.State;
                    break;
            }
            if (flagStateBF & 0x80) {
                // lap
            }

            break;
        }
        case 0x19: {
            const oldEventCount = state._EventCount0x19 || 0;

            let eventCount = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 1);
            const cadence = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 2);
            let accPower = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 3);
            const power = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 5) & 0xfff;
            const trainerStatus = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 6) >> 4;
            const flagStateBF = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 7);

            if (eventCount !== oldEventCount) {
                state._EventCount0x19 = eventCount;
                if (oldEventCount > eventCount) {
                    //Hit rollover value
                    eventCount += 255;
                }
            }

            if (cadence !== 0xff) {
                state.Cadence = cadence;
            }

            if (power !== 0xfff) {
                state.InstantaneousPower = power;

                const oldAccPower = (state.AccumulatedPower || 0) % 65536;
                if (accPower !== oldAccPower) {
                    if (oldAccPower > accPower) {
                        accPower += 65536;
                    }
                }
                state.AccumulatedPower = (state.AccumulatedPower || 0) + accPower - oldAccPower;

                state.AveragePower = (accPower - oldAccPower) / (eventCount - oldEventCount);
            }

            state.TrainerStatus = trainerStatus;

            switch (flagStateBF & 0x03) {
                case 0:
                    state.TargetStatus = "OnTarget";
                    break;
                case 1:
                    state.TargetStatus = "LowSpeed";
                    break;
                case 2:
                    state.TargetStatus = "HighSpeed";
                    break;
                default:
                    delete state.TargetStatus;
                    break;
            }

            switch ((flagStateBF & 0x70) >> 4) {
                case 1:
                    state.State = "OFF";
                    break;
                case 2:
                    state.State = "READY";
                    resetState(state);
                    break;
                case 3:
                    state.State = "IN_USE";
                    break;
                case 4:
                    state.State = "FINISHED";
                    break;
                default:
                    delete state.State;
                    break;
            }
            if (flagStateBF & 0x80) {
                // lap
            }

            break;
        }
        case 0x1a: {
            const oldEventCount = state._EventCount0x1A || 0;

            let eventCount = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 1);
            let wheelTicks = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 2);
            let accWheelPeriod = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 3);
            let accTorque = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 5);
            const flagStateBF = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 7);

            if (eventCount !== oldEventCount) {
                state._EventCount0x1A = eventCount;
                if (oldEventCount > eventCount) {
                    //Hit rollover value
                    eventCount += 255;
                }
            }

            const oldWheelTicks = (state.WheelTicks || 0) % 256;
            if (wheelTicks !== oldWheelTicks) {
                if (oldWheelTicks > wheelTicks) {
                    wheelTicks += 65536;
                }
            }
            state.WheelTicks = (state.WheelTicks || 0) + wheelTicks - oldWheelTicks;

            const oldWheelPeriod = (state.WheelPeriod || 0) % 256;
            if (accWheelPeriod !== oldWheelPeriod) {
                if (oldWheelPeriod > accWheelPeriod) {
                    accWheelPeriod += 65536;
                }
            }
            state.WheelPeriod = (state.WheelPeriod || 0) + accWheelPeriod - oldWheelPeriod;

            const oldTorque = (state.Torque || 0) % 256;
            if (accTorque !== oldTorque) {
                if (oldTorque > accTorque) {
                    accTorque += 65536;
                }
            }
            state.Torque = (state.Torque || 0) + accTorque - oldTorque;

            switch ((flagStateBF & 0x70) >> 4) {
                case 1:
                    state.State = "OFF";
                    break;
                case 2:
                    state.State = "READY";
                    resetState(state);
                    break;
                case 3:
                    state.State = "IN_USE";
                    break;
                case 4:
                    state.State = "FINISHED";
                    break;
                default:
                    delete state.State;
                    break;
            }
            if (flagStateBF & 0x80) {
                // lap
            }

            break;
        }
        case 0x50: {
            state.HwVersion = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
            state.ManId = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 4);
            state.ModelNum = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 6);
            break;
        }
        case 0x51: {
            const swRevSup = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 2);
            const swRevMain = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
            const serial = data.readInt32LE(Messages.BUFFER_INDEX_MSG_DATA + 4);

            state.SwVersion = swRevMain;

            if (swRevSup !== 0xff) {
                state.SwVersion += swRevSup / 1000;
            }

            if (serial !== 0xffffffff) {
                state.SerialNumber = serial;
            }

            break;
        }
        case 0x56: {
            const idx = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 1);
            const tot = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 2);
            const chState = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
            const devId = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 4);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const trType = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 6);
            const devType = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 7);

            if (idx === 0) {
                state.PairedDevices = [];
            }

            if (tot > 0) {
                state.PairedDevices.push({
                    id: devId,
                    type: devType,
                    paired: chState & 0x80 ? true : false,
                });
            }

            break;
        }
        default:
            return;
    }
    sensor.emit("fitnessData", state);
}
