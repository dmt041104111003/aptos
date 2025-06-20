import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { useProfile } from '../contexts/ProfileContext';
import { uploadJSONToIPFS } from '@/utils/pinata';
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { Briefcase, Plus, X, Rocket } from 'lucide-react';
import Navbar from '@/components/ui2/Navbar';

const JOBS_MODULE_ADDRESS = "0x1e76fb2bf0294126ee928c0c2348b428c174fdff2b9cec59df719396ca393f72";
const JOBS_MODULE_NAME = "job_marketplace_v29";

const config = new AptosConfig({ network: Network.TESTNET, clientConfig: { API_KEY: "AG-LA7UZDTNF2T1Y6H1DFA6CNSGVRQSRUKSA" } });
const aptos = new Aptos(config);

interface FormState {
  title: string;
  description: string;
  skills: string[];
  milestones: { amount: number; duration: number }[];
  applicationDeadlineDays: number;
}

const PostJob = () => {
  const navigate = useNavigate();
  const { account, accountType } = useWallet();
  const { profile } = useProfile();
  const [skill, setSkill] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMilestoneAmount, setNewMilestoneAmount] = useState<string>('');
  const [newMilestoneDuration, setNewMilestoneDuration] = useState<string>('');
  
  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    skills: [],
    milestones: [],
    applicationDeadlineDays: 7,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'applicationDeadlineDays' ? Number(value) : value
    }));
  };

  const handleSkillAdd = () => {
    if (skill && !form.skills.includes(skill)) {
      setForm(prev => ({ ...prev, skills: [...prev.skills, skill] }));
      setSkill('');
    }
  };

  const handleSkillRemove = (skillToRemove: string) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }));
  };

  // const handleAddMilestone = () => {
  //   const amount = Number(newMilestoneAmount);
  //   if (amount > 0) {
  //     setForm(prev => ({
  //       ...prev,
  //       milestones: [...prev.milestones, { amount, duration: 0 }]
  //     }));
  //     setNewMilestoneAmount('');
  //   } else {
  //     toast.error('Vui lòng nhập số tiền hợp lệ cho cột mốc.');
  //   }
  // };

  // const handleRemoveMilestone = (indexToRemove: number) => {
  //   setForm(prev => ({
  //     ...prev,
  //     milestones: prev.milestones.filter((_, index) => index !== indexToRemove)
  //   }));
  // };

  const updateMilestone = (idx: number, field: 'amount' | 'duration', value: number) => {
    setForm(prev => ({
      ...prev,
      milestones: prev.milestones.map((ms, i) => i === idx ? { ...ms, [field]: value } : ms)
    }));
  };

  const removeMilestone = (idx: number) => {
    setForm(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== idx)
    }));
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!form.title.trim()) newErrors.title = 'Vui lòng nhập tiêu đề dự án';
    if (!form.description.trim()) newErrors.description = 'Vui lòng nhập mô tả công việc';
    if (!form.skills.length) newErrors.skills = 'Vui lòng nhập ít nhất 1 kỹ năng';
    if (!form.milestones.length) newErrors.milestones = 'Vui lòng thêm ít nhất 1 cột mốc';
    if (!form.applicationDeadlineDays || form.applicationDeadlineDays <= 0) newErrors.applicationDeadlineDays = 'Vui lòng nhập thời hạn nộp đơn hợp lệ';
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }

    if (!account || accountType !== 'aptos' || !window.aptos) {
      toast.error('Vui lòng kết nối ví Aptos để đăng dự án.');
      return;
    }

    setIsSubmitting(true);

    try {
      const jobData = {
        title: form.title,
        description: form.description,
        skills: form.skills,
        poster: account,
        posterProfile: profile.profile_cid,
        postedAt: new Date().toISOString(),
      };
      
      const cid = await uploadJSONToIPFS(jobData);
      const milestoneAmounts = form.milestones.map(ms => ms.amount);
      const milestoneDurations = form.milestones.map(ms => ms.duration * 24 * 60 * 60); 
      const txnPayload = {
        type: "entry_function_payload",
        function: `${JOBS_MODULE_ADDRESS}::${JOBS_MODULE_NAME}::post_job`,
        type_arguments: [],
        arguments: [
          Array.from(new TextEncoder().encode(form.title)), 
          cid, 
          milestoneAmounts.map(m => m * 100_000_000), 
          Math.floor(Date.now() / 1000) + form.applicationDeadlineDays * 24 * 60 * 60, 
          form.skills.map(skill => Array.from(new TextEncoder().encode(skill))),
          milestoneDurations, 
        ]
      };

      const txnHash = await window.aptos.signAndSubmitTransaction(txnPayload);
      await aptos.waitForTransaction({ transactionHash: txnHash.hash });
    
      toast.success('Đăng dự án thành công!');
      navigate('/jobs');
    } catch (error) {
      console.error('Job post failed:', error);
      toast.error('Đăng dự án thất bại. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2 text-white">
              <Briefcase className="w-6 h-6 text-blue-400" />
              Đăng Dự Án Mới
            </CardTitle>
            <CardDescription className="text-gray-400">
              Điền thông tin chi tiết về dự án của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-white">Tiêu đề dự án</Label>
                <Input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: Cần phát triển smart contract cho marketplace"
                  className={`bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50 ${errors.title ? 'border-red-500/50' : ''}`}
                />
                {errors.title && <p className="text-red-400 text-sm">{errors.title}</p>}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-white">Mô tả chi tiết</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                  placeholder="Mô tả chi tiết về dự án, yêu cầu và mục tiêu..."
                  className={`min-h-[200px] bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50 ${errors.description ? 'border-red-500/50' : ''}`}
                />
                {errors.description && <p className="text-red-400 text-sm">{errors.description}</p>}
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <Label className="text-white">Kỹ năng yêu cầu</Label>
                <div className="flex gap-2">
                  <Input
                    value={skill}
                    onChange={(e) => setSkill(e.target.value)}
                    placeholder="Thêm kỹ năng..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleSkillAdd())}
                    className={`bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50 ${errors.skills ? 'border-red-500/50' : ''}`}
                  />
                  <Button type="button" onClick={handleSkillAdd} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                    <Plus className="w-4 h-4 text-blue-400" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="flex items-center gap-1 bg-blue-500/20 text-blue-300 border-blue-500/30">
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleSkillRemove(skill)}
                        className="text-blue-300 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                {errors.skills && <p className="text-red-400 text-sm">{errors.skills}</p>}
              </div>

              {/* Application Deadline */}
              <div className="space-y-2">
                <Label htmlFor="applicationDeadlineDays" className="text-white">Thời hạn nộp đơn (ngày)</Label>
                <Input
                  id="applicationDeadlineDays"
                  name="applicationDeadlineDays"
                  type="number"
                  value={form.applicationDeadlineDays}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: 7 (trong 7 ngày)"
                  className={`bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50 ${errors.applicationDeadlineDays ? 'border-red-500/50' : ''}`}
                />
                {errors.applicationDeadlineDays && <p className="text-red-400 text-sm">{errors.applicationDeadlineDays}</p>}
              </div>

              {/* Milestones Section */}
              <div className="space-y-2">
                <Label className="text-white">Cột mốc dự án <span className="text-gray-400 text-sm">(Số tiền và thời gian ước tính cho mỗi giai đoạn)</span></Label>
                {/* Row for adding new milestone */}
                <div className="flex gap-2 items-center mb-2">
                  <Input
                    type="number"
                    value={newMilestoneAmount}
                    onChange={e => setNewMilestoneAmount(e.target.value)}
                    placeholder="Số tiền (APT)"
                    className="w-40 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50"
                  />
                  <Input
                    type="number"
                    value={newMilestoneDuration}
                    onChange={e => setNewMilestoneDuration(e.target.value)}
                    placeholder="Thời gian (ngày)"
                    className="w-40 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      const amount = Number(newMilestoneAmount);
                      const duration = Number(newMilestoneDuration);
                      if (amount > 0 && duration > 0) {
                        setForm(prev => ({
                          ...prev,
                          milestones: [...prev.milestones, { amount, duration }],
                        }));
                        setNewMilestoneAmount('');
                        setNewMilestoneDuration('');
                      } else {
                        toast.error('Vui lòng nhập số tiền và thời gian hợp lệ cho cột mốc.');
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Thêm cột mốc
                  </Button>
                </div>
                {/* List of added milestones */}
                {form.milestones.map((ms, idx) => (
                  <div key={idx} className="flex gap-2 items-center mb-2">
                    <Input
                      type="number"
                      value={ms.amount}
                      onChange={e => updateMilestone(idx, 'amount', Number(e.target.value))}
                      placeholder="Số tiền (APT)"
                      className="w-40 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50"
                    />
                    <Input
                      type="number"
                      value={ms.duration}
                      onChange={e => updateMilestone(idx, 'duration', Number(e.target.value))}
                      placeholder="Thời gian (ngày)"
                      className="w-40 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50"
                    />
                    <Button type="button" variant="destructive" size="sm" onClick={() => removeMilestone(idx)}>
                      Xóa
                    </Button>
                  </div>
                ))}
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang xử lý...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Rocket className="w-4 h-4" />
                    Đăng dự án
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PostJob;