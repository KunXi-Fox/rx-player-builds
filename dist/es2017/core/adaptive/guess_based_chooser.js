/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import log from "../../log";
import arrayFindIndex from "../../utils/array_find_index";
import getMonotonicTimeStamp from "../../utils/monotonic_timestamp";
import { estimateRequestBandwidth } from "./network_analyzer";
/**
 * Estimate which Representation should be played based on risky "guesses".
 *
 * Basically, this `GuessBasedChooser` will attempt switching to the superior
 * quality when conditions allows this and then check if we're able to maintain
 * this quality. If we're not, it will rollbacks to the previous, maintaninable,
 * guess.
 *
 * The algorithm behind the `GuessBasedChooser` is very risky in terms of
 * rebuffering chances. As such, it should only be used when other approach
 * don't work (e.g.  low-latency contents).
 * @class GuessBasedChooser
 */
export default class GuessBasedChooser {
    /**
     * Create a new `GuessBasedChooser`.
     * @param {Object} scoreCalculator
     * @param {Object} prevEstimate
     */
    constructor(scoreCalculator, prevEstimate) {
        this._scoreCalculator = scoreCalculator;
        this._lastAbrEstimate = prevEstimate;
        this._consecutiveWrongGuesses = 0;
        this._blockGuessesUntil = 0;
        this._lastMaintanableBitrate = null;
    }
    /**
     * Perform a "guess", which basically indicates which Representation should be
     * chosen according to the `GuessBasedChooser`.
     *
     * @param {Array.<Object>} representations - Array of all Representation the
     * GuessBasedChooser can choose from, sorted by bitrate ascending.
     * /!\ It is very important that Representation in that Array are sorted by
     * bitrate ascending for this method to work as intented.
     * @param {Object} observation - Last playback observation performed.
     * @param {Object} currentRepresentation - The Representation currently
     * loading.
     * @param {number} incomingBestBitrate - The bitrate of the Representation
     * chosen by the more optimistic of the other ABR algorithms currently.
     * @param {Array.<Object>} requests - Information on all pending requests.
     * @returns {Object|null} - If a guess is made, return that guess, else
     * returns `null` (in which case you should fallback to another ABR
     * algorithm).
     */
    getGuess(representations, observation, currentRepresentation, incomingBestBitrate, requests) {
        const { bufferGap, speed } = observation;
        const lastChosenRep = this._lastAbrEstimate.representation;
        if (lastChosenRep === null) {
            return null; // There's nothing to base our guess on
        }
        if (incomingBestBitrate > lastChosenRep.bitrate) {
            // ABR estimates are already superior or equal to the guess
            // we'll be doing here, so no need to guess
            if (this._lastAbrEstimate.algorithmType === 2 /* ABRAlgorithmType.GuessBased */) {
                if (this._lastAbrEstimate.representation !== null) {
                    this._lastMaintanableBitrate = this._lastAbrEstimate.representation.bitrate;
                }
                this._consecutiveWrongGuesses = 0;
            }
            return null;
        }
        const scoreData = this._scoreCalculator.getEstimate(currentRepresentation);
        if (this._lastAbrEstimate.algorithmType !== 2 /* ABRAlgorithmType.GuessBased */) {
            if (scoreData === undefined) {
                return null; // not enough information to start guessing
            }
            if (this._canGuessHigher(bufferGap, speed, scoreData)) {
                const nextRepresentation = getNextRepresentation(representations, currentRepresentation);
                if (nextRepresentation !== null) {
                    return nextRepresentation;
                }
            }
            return null;
        }
        // If we reached here, we're currently already in guessing mode
        if (this._isLastGuessValidated(lastChosenRep, incomingBestBitrate, scoreData)) {
            log.debug("ABR: Guessed Representation validated", lastChosenRep.bitrate);
            this._lastMaintanableBitrate = lastChosenRep.bitrate;
            this._consecutiveWrongGuesses = 0;
        }
        if (currentRepresentation.id !== lastChosenRep.id) {
            return lastChosenRep;
        }
        const shouldStopGuess = this._shouldStopGuess(currentRepresentation, scoreData, bufferGap, requests);
        if (shouldStopGuess) {
            // Block guesses for a time
            this._consecutiveWrongGuesses++;
            this._blockGuessesUntil = getMonotonicTimeStamp() +
                Math.min(this._consecutiveWrongGuesses * 15000, 120000);
            return getPreviousRepresentation(representations, currentRepresentation);
        }
        else if (scoreData === undefined) {
            return currentRepresentation;
        }
        if (this._canGuessHigher(bufferGap, speed, scoreData)) {
            const nextRepresentation = getNextRepresentation(representations, currentRepresentation);
            if (nextRepresentation !== null) {
                return nextRepresentation;
            }
        }
        return currentRepresentation;
    }
    /**
     * Returns `true` if we've enough confidence on the current situation to make
     * a higher guess.
     * @param {number} bufferGap
     * @param {number} speed
     * @param {Array} scoreData
     * @returns {boolean}
     */
    _canGuessHigher(bufferGap, speed, { score, confidenceLevel }) {
        return isFinite(bufferGap) && bufferGap >= 2.5 &&
            getMonotonicTimeStamp() > this._blockGuessesUntil &&
            confidenceLevel === 1 /* ScoreConfidenceLevel.HIGH */ &&
            score / speed > 1.01;
    }
    /**
     * Returns `true` if the pending guess of `lastGuess` seems to not
     * be maintainable and as such should be stopped.
     * @param {Object} lastGuess
     * @param {Array} scoreData
     * @param {number} bufferGap
     * @param {Array.<Object>} requests
     * @returns {boolean}
     */
    _shouldStopGuess(lastGuess, scoreData, bufferGap, requests) {
        if (scoreData !== undefined && scoreData.score < 1.01) {
            return true;
        }
        else if ((scoreData === undefined || scoreData.score < 1.2) && bufferGap < 0.6) {
            return true;
        }
        const guessedRepresentationRequests = requests.filter(req => {
            return req.content.representation.id === lastGuess.id;
        });
        const now = getMonotonicTimeStamp();
        for (const req of guessedRepresentationRequests) {
            const requestElapsedTime = now - req.requestTimestamp;
            if (req.content.segment.isInit) {
                if (requestElapsedTime > 1000) {
                    return true;
                }
            }
            else if (requestElapsedTime > req.content.segment.duration * 1000 + 200) {
                return true;
            }
            else {
                const fastBw = estimateRequestBandwidth(req);
                if (fastBw !== undefined && fastBw < lastGuess.bitrate * 0.8) {
                    return true;
                }
            }
        }
        return false;
    }
    _isLastGuessValidated(lastGuess, incomingBestBitrate, scoreData) {
        if (scoreData !== undefined &&
            scoreData.confidenceLevel === 1 /* ScoreConfidenceLevel.HIGH */ &&
            scoreData.score > 1.5) {
            return true;
        }
        return incomingBestBitrate >= lastGuess.bitrate &&
            (this._lastMaintanableBitrate === null ||
                this._lastMaintanableBitrate < lastGuess.bitrate);
    }
}
/**
 * From the array of Representations given, returns the Representation with a
 * bitrate immediately superior to the current one.
 * Returns `null` if that "next" Representation is not found.
 *
 * /!\ The representations have to be already sorted by bitrate, in ascending
 * order.
 * @param {Array.<Object>} representations - Available representations to choose
 * from, sorted by bitrate in ascending order.
 * @param {Object} currentRepresentation - The Representation currently
 * considered.
 * @returns {Object|null}
 */
function getNextRepresentation(representations, currentRepresentation) {
    const len = representations.length;
    let index = arrayFindIndex(representations, ({ id }) => id === currentRepresentation.id);
    if (index < 0) {
        log.error("ABR: Current Representation not found.");
        return null;
    }
    while (++index < len) {
        if (representations[index].bitrate > currentRepresentation.bitrate) {
            return representations[index];
        }
    }
    return null;
}
/**
 * From the array of Representations given, returns the Representation with a
 * bitrate immediately inferior.
 * Returns `null` if that "previous" Representation is not found.
 * @param {Array.<Object>} representations
 * @param {Object} currentRepresentation
 * @returns {Object|null}
 */
function getPreviousRepresentation(representations, currentRepresentation) {
    let index = arrayFindIndex(representations, ({ id }) => id === currentRepresentation.id);
    if (index < 0) {
        log.error("ABR: Current Representation not found.");
        return null;
    }
    while (--index >= 0) {
        if (representations[index].bitrate < currentRepresentation.bitrate) {
            return representations[index];
        }
    }
    return null;
}
