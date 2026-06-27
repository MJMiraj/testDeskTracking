const LeaveRequest = require('../models/LeaveRequest');
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

exports.applyLeave = asyncHandler(async (req, res) => {
    const { leaveType, startDate, endDate, reason } = req.body;
    const leave = await LeaveRequest.create({
        userId: req.user.id,
        leaveType,
        startDate,
        endDate,
        reason
    });
    res.status(201).json({ success: true, data: leave });
});

exports.getMyLeaves = asyncHandler(async (req, res) => {
    const leaves = await LeaveRequest.findAll({
        where: { userId: req.user.id },
        order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ success: true, count: leaves.length, data: leaves });
});
