/**
 * Created by leo on 12/5/2017.
 *
 * 【用户反馈】
 */
var Model = require('./model');

function FeedbackModel() {
    Model.call(this);

    this.model = 'feedbacks';

    this.STATUS = {
        PENDING: 'pending',
        ACCEPTED: 'accepted'
    };

    /**
     * 创建用户反馈
     *
     * @param user_id: 用户ID
     * @param content: 反馈内容
     * @param contact: 联系方式
     * @param callback: 回调
     */
    this.createUserFeedback = function(user_id, content, contact, callback) {
        var feedback = {
            user_id: user_id,
            content: content,
            contact: contact,
            status: this.STATUS.PENDING,
            created_at: UTIL.getTimeDesc()
        };

        this.create(feedback, callback);
    };
}

FeedbackModel.prototype = new Model();
FeedbackModel.prototype.constructor = FeedbackModel;

global.FeedbackModel = new FeedbackModel();
module.exports = global.FeedbackModel;